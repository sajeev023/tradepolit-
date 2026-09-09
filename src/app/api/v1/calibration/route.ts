import { NextRequest } from "next/server";
import { prisma, isMockDb } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

export interface CalibrationBucket {
  tier: "LOW" | "MEDIUM" | "HIGH";
  predictedRate: number; // e.g. 0.45, 0.60, 0.75
  observedRate: number | null; // e.g. 0.72
  sampleSize: number; // N
  wins: number;
  losses: number;
  confidenceInterval: [number, number] | null; // Wilson score 95%
  status: "WELL_CALIBRATED" | "OVERCONFIDENT" | "UNDERCONFIDENT" | "INSUFFICIENT_DATA";
  statusLabel: string;
}

export interface CalibrationSummary {
  totalResolved: number;
  totalWithOutcome: number;
  overallCalibrationStatus: "WELL_CALIBRATED" | "OVERCONFIDENT" | "UNDERCONFIDENT" | "INSUFFICIENT_DATA";
  brierScore: number | null;
  buckets: CalibrationBucket[];
  breakdowns: {
    byAssetClass: { name: string; sampleSize: number; winRate: number | null }[];
    byRegime: { name: string; sampleSize: number; winRate: number | null }[];
  };
}

/**
 * Resolve the deterministic confidence tier the system actually committed at.
 * Snapshots are authoritative; text fallback is only for pre-snapshot rows.
 */
function resolveTier(t: any): "LOW" | "MEDIUM" | "HIGH" | null {
  const snapTier = t.contextSnapshot?.confidence?.tier;
  if (snapTier === "LOW" || snapTier === "MEDIUM" || snapTier === "HIGH") return snapTier;
  const persistedScore = t.confidenceScore;
  if (typeof persistedScore === "number") {
    if (persistedScore >= 68) return "HIGH";
    if (persistedScore >= 45) return "MEDIUM";
    return "LOW";
  }
  const text = String(t.confidence || "").toUpperCase();
  if (text.includes("HIGH")) return "HIGH";
  if (text.includes("MEDIUM")) return "MEDIUM";
  if (text.includes("LOW")) return "LOW";
  return null;
}

/**
 * Resolve the actual probability the system committed at for Brier scoring.
 * Uses snapshot score when available, otherwise the tier midpoint.
 */
function resolveProbability(t: any): number | null {
  const snapScore = t.contextSnapshot?.confidence?.score;
  if (typeof snapScore === "number" && snapScore >= 0 && snapScore <= 100) {
    return snapScore / 100;
  }
  const tier = resolveTier(t);
  if (!tier) return null;
  const midpoint: Record<"LOW" | "MEDIUM" | "HIGH", number> = { LOW: 0.45, MEDIUM: 0.6, HIGH: 0.75 };
  return midpoint[tier];
}

/**
 * Wilson score interval for binomial proportion with 95% confidence (z = 1.96)
 */
function wilsonScoreInterval(wins: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = wins / n;
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const lower = Math.max(0, (center - spread) / denominator);
  const upper = Math.min(1, (center + spread) / denominator);
  return [Math.round(lower * 100) / 100, Math.round(upper * 100) / 100];
}

const MIN_BUCKET_SAMPLE = 10;

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    if (isMockDb) {
      return successResponse({
        totalResolved: 0,
        totalWithOutcome: 0,
        overallCalibrationStatus: "INSUFFICIENT_DATA",
        brierScore: null,
        buckets: [
          {
            tier: "LOW",
            predictedRate: 0.45,
            observedRate: null,
            sampleSize: 0,
            wins: 0,
            losses: 0,
            confidenceInterval: null,
            status: "INSUFFICIENT_DATA",
            statusLabel: "Not enough observations yet (N < 10)",
          },
          {
            tier: "MEDIUM",
            predictedRate: 0.60,
            observedRate: null,
            sampleSize: 0,
            wins: 0,
            losses: 0,
            confidenceInterval: null,
            status: "INSUFFICIENT_DATA",
            statusLabel: "Not enough observations yet (N < 10)",
          },
          {
            tier: "HIGH",
            predictedRate: 0.75,
            observedRate: null,
            sampleSize: 0,
            wins: 0,
            losses: 0,
            confidenceInterval: null,
            status: "INSUFFICIENT_DATA",
            statusLabel: "Not enough observations yet (N < 10)",
          },
        ],
        breakdowns: { byAssetClass: [], byRegime: [] },
      });
    }

    const { searchParams } = new URL(request.url);
    const assetClassFilter = searchParams.get("assetClass");

    // Fetch all resolved theses for user
    const resolvedTheses = await prisma.thesis.findMany({
      where: {
        userId: user.id,
        status: { in: ["HIT", "INVALIDATED"] },
        ...(assetClassFilter ? { assetClass: assetClassFilter as any } : {}),
      },
      include: { outcome: true },
      orderBy: { createdAt: "desc" },
    });

    const totalResolved = resolvedTheses.length;

    // Group by confidence tier (LOW, MEDIUM, HIGH)
    const tiers: Array<"LOW" | "MEDIUM" | "HIGH"> = ["LOW", "MEDIUM", "HIGH"];
    const predictedRates: Record<"LOW" | "MEDIUM" | "HIGH", number> = {
      LOW: 0.45,
      MEDIUM: 0.60,
      HIGH: 0.75,
    };

    let totalSquaredError = 0;
    let brierN = 0;

    const buckets: CalibrationBucket[] = tiers.map((tier) => {
      const matchingTheses = resolvedTheses.filter((t: any) => resolveTier(t) === tier);

      const n = matchingTheses.length;
      let wins = 0;
      let losses = 0;

      matchingTheses.forEach((t: any) => {
        const isWin = t.outcome?.result === "WIN" || t.status === "HIT";
        if (isWin) wins++;
        else losses++;
      });

      const observedRate = n > 0 ? wins / n : null;
      const ci = n >= MIN_BUCKET_SAMPLE ? wilsonScoreInterval(wins, n) : null;

      let status: CalibrationBucket["status"] = "INSUFFICIENT_DATA";
      let statusLabel = `Not enough observations yet (N = ${n} / ${MIN_BUCKET_SAMPLE} min)`;

      if (n >= MIN_BUCKET_SAMPLE && observedRate !== null) {
        const target = predictedRates[tier];
        const tolerance = 0.08; // +/- 8% is considered well calibrated
        if (Math.abs(observedRate - target) <= tolerance) {
          status = "WELL_CALIBRATED";
          statusLabel = "Well calibrated";
        } else if (observedRate < target - tolerance) {
          status = "OVERCONFIDENT";
          statusLabel = "Overconfident (observed rate lags predicted)";
        } else {
          status = "UNDERCONFIDENT";
          statusLabel = "Underconfident (observed rate exceeds predicted)";
        }
      }

      return {
        tier,
        predictedRate: predictedRates[tier],
        observedRate: observedRate !== null ? Math.round(observedRate * 100) / 100 : null,
        sampleSize: n,
        wins,
        losses,
        confidenceInterval: ci,
        status,
        statusLabel,
      };
    });

    // V4.1 Brier score: use the actual committed probability per thesis, not the
    // tier midpoint. A thesis is a binary event (WIN=1, LOSS=0). Outcome takes
    // precedence; if no outcome is logged we fall back to resolution status.
    resolvedTheses.forEach((t: any) => {
      const p = resolveProbability(t);
      if (p === null) return;
      const isWin = t.outcome?.result === "WIN" || t.status === "HIT";
      const outcome = isWin ? 1 : 0;
      totalSquaredError += Math.pow(p - outcome, 2);
      brierN++;
    });

    const brierScore = brierN >= 10 ? Math.round((totalSquaredError / brierN) * 1000) / 1000 : null;

    // Overall calibration status
    let overallCalibrationStatus: CalibrationSummary["overallCalibrationStatus"] = "INSUFFICIENT_DATA";
    const sufficientBuckets = buckets.filter((b) => b.status !== "INSUFFICIENT_DATA");
    if (sufficientBuckets.length >= 2) {
      if (sufficientBuckets.every((b) => b.status === "WELL_CALIBRATED")) {
        overallCalibrationStatus = "WELL_CALIBRATED";
      } else if (sufficientBuckets.some((b) => b.status === "OVERCONFIDENT")) {
        overallCalibrationStatus = "OVERCONFIDENT";
      } else {
        overallCalibrationStatus = "UNDERCONFIDENT";
      }
    }

    // Breakdowns
    const assetClassMap = new Map<string, { wins: number; total: number }>();
    const regimeMap = new Map<string, { wins: number; total: number }>();

    resolvedTheses.forEach((t: any) => {
      const ac = String(t.assetClass || "UNKNOWN");
      const rg = String(t.regimeAtCreation || "UNSPECIFIED");
      const isWin = t.outcome?.result === "WIN" || t.status === "HIT";

      const acEntry = assetClassMap.get(ac) || { wins: 0, total: 0 };
      acEntry.total++;
      if (isWin) acEntry.wins++;
      assetClassMap.set(ac, acEntry);

      const rgEntry = regimeMap.get(rg) || { wins: 0, total: 0 };
      rgEntry.total++;
      if (isWin) rgEntry.wins++;
      regimeMap.set(rg, rgEntry);
    });

    const byAssetClass = Array.from(assetClassMap.entries()).map(([name, { wins, total }]) => ({
      name,
      sampleSize: total,
      winRate: total > 0 ? Math.round((wins / total) * 100) / 100 : null,
    }));

    const byRegime = Array.from(regimeMap.entries()).map(([name, { wins, total }]) => ({
      name,
      sampleSize: total,
      winRate: total > 0 ? Math.round((wins / total) * 100) / 100 : null,
    }));

    return successResponse({
      totalResolved,
      totalWithOutcome: resolvedTheses.filter((t: any) => !!t.outcome).length,
      overallCalibrationStatus,
      brierScore,
      buckets,
      breakdowns: { byAssetClass, byRegime },
    });
  } catch (err) {
    return dispatchCaughtError("Failed to compute calibration", err);
  }
}
