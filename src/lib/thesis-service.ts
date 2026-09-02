/**
 * src/lib/thesis-service.ts
 *
 * THESIS SERVICE — the retention core of V2.
 *
 * A Thesis is a structured, validated trade thesis saved from an
 * analysis. The service:
 *   - creates theses ONLY through the trade-logic engine (no
 *     contradictory plan can ever be persisted),
 *   - evaluates open theses against live prices (resolve HIT /
 *     INVALIDATED / EXPIRED),
 *   - produces notifications when a thesis resolves,
 *   - links outcomes back to the journal (the learning loop).
 */

import { prisma } from "./prisma";
import { getLivePrice, getOHLCV } from "./market";
import { validateSetupNumbers, synthSetup } from "./trade-logic";
import type { AIAnalysisPayload, TradeTelemetryContext } from "./trade-validator";
import { getAssetClass } from "./market-registry";

export interface CreateThesisInput {
  userId: string;
  symbol: string;
  timeframe: string;
  analysis: AIAnalysisPayload;
  telemetry: TradeTelemetryContext;
  aiSummary: string;
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  invalidationConditions?: string;
  sourceAnalysisId?: string;
}

export interface ThesisEvaluation {
  thesisId: string;
  status: "HIT" | "INVALIDATED" | "EXPIRED" | "OPEN";
  resolvedPrice?: number;
}

/** Create a thesis from a validated analysis. Numbers always pass the
 *  trade-logic engine — a contradictory plan can never be persisted. */
export async function createThesis(input: CreateThesisInput) {
  const setup = synthSetup(input.analysis, input.telemetry);
  const { isValid, issues } = validateSetupNumbers(setup);
  if (!isValid || !setup) {
    throw Object.assign(new Error(`Trade plan failed validation: ${issues.join("; ")}`), {
      status: 422,
      issues,
    });
  }

  // Run the market context engine for the creation-time regime stamp.
  const { buildMarketContext } = await import("./market-context");
  const { getOHLCV } = await import("./market");
  let regimeAtCreation: string | null = null;
  let fallbackEvidence: { for: string[]; against: string[] } = { for: [], against: [] };
  try {
    const candles = await getOHLCV(input.symbol, input.timeframe, 100);
    const ctx = await buildMarketContext(input.symbol, input.timeframe, candles, {
      trend: input.telemetry.trend,
      volatilityPct: input.telemetry.volatility ?? 1,
      isVolatilitySpike: input.telemetry.isVolatilitySpike ?? false,
      support: input.telemetry.support,
      resistance: input.telemetry.resistance,
      currentPrice: input.telemetry.currentPrice,
      rsi: input.telemetry.rsi ?? 50,
      macdValue: input.telemetry.macdValue ?? 0,
      macdSignal: input.telemetry.macdSignal ?? 0,
      macdHistogram: input.telemetry.macdHistogram ?? 0,
      atr: input.telemetry.atr ?? input.telemetry.currentPrice * 0.005,
    });
    regimeAtCreation = ctx.regime.label;

    // V2.5: when the client didn't carry evidence from the analysis,
    // rebuild it deterministically now so EVERY thesis in the dataset
    // has a structured "why" — never empty by accident.
    if (!input.evidenceFor || input.evidenceFor.length === 0) {
      const { buildEvidence } = await import("./evidence-builder");
      fallbackEvidence = buildEvidence(setup.direction, ctx, {
        rsi: input.telemetry.rsi ?? 50,
        rsiLabel: String((input.telemetry as never as { rsiLabel?: string }).rsiLabel ?? "Neutral"),
        macdValue: input.telemetry.macdValue ?? 0,
        macdSignal: input.telemetry.macdSignal ?? 0,
        macdHistogram: input.telemetry.macdHistogram ?? 0,
        trend: input.telemetry.trend,
      });
    }
  } catch {
    // Regime stamp + fallback evidence are best-effort, never blockers.
  }

  return prisma.thesis.create({
    data: {
      userId: input.userId,
      symbol: input.symbol,
      timeframe: input.timeframe,
      assetClass: getAssetClass(input.symbol) as never,
      bias: setup.direction,
      setupType: input.analysis.setupQuality ?? null,
      confidence: input.analysis.confidence ?? "MEDIUM",
      entryZone: setup.entry,
      stopLoss: setup.stopLoss,
      invalidation: setup.invalidation,
      target: setup.target,
      riskReward: setup.riskReward,
      regimeAtCreation,
      evidenceFor: input.evidenceFor && input.evidenceFor.length > 0 ? input.evidenceFor : fallbackEvidence.for,
      evidenceAgainst:
        input.evidenceAgainst && input.evidenceAgainst.length > 0 ? input.evidenceAgainst : fallbackEvidence.against,
      invalidationConditions:
        input.invalidationConditions ??
        `Thesis invalid on a ${input.timeframe} close ${setup.direction === "LONG" ? "below" : "above"} $${setup.invalidation.toLocaleString()}.`,
      aiSummary: input.aiSummary.slice(0, 4000),
      sourceAnalysisId: input.sourceAnalysisId ?? null,
    },
  });
}

/** Evaluate OPEN theses for a user against live prices.
 *  Resolves HIT / INVALIDATED / EXPIRED.
 *
 *  V2.5 correctness: WINDOWED resolution. A spot check every 5 minutes
 *  misses intrabar moves that touched target or invalidation and
 *  reversed — the thesis would stay falsely OPEN (or resolve on the
 *  wrong side). We fetch candles on the thesis timeframe since the last
 *  check and resolve against the window's HIGH/LOW extremes, with
 *  risk-conservative ordering (invalidation beats target when both were
 *  touched in the same window). Outcomes become trustworthy enough to
 *  grade — a prerequisite for the attribution dataset. */
export async function evaluateOpenTheses(userId: string, maxTheses = 50): Promise<ThesisEvaluation[]> {
  const openTheses = await prisma.thesis.findMany({
    where: { userId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: maxTheses,
  });
  if (openTheses.length === 0) return [];

  // One price fetch + one candle fetch per distinct symbol/pair.
  const symbols = [...new Set(openTheses.map((t: { symbol: string }) => t.symbol))] as string[];
  const prices = new Map<string, number>();
  await Promise.all(
    (symbols as string[]).map(async (s: string) => {
      try {
        const p = await getLivePrice(s);
        if (p && Number.isFinite(p.price)) prices.set(s, p.price);
      } catch {
        // Skip symbols we can't price this pass.
      }
    })
  );

  // Candle windows per distinct (symbol, timeframe) pair — one fetch
  // each, so upstream cost stays flat regardless of thesis count.
  const candlesByPair = new Map<string, { timestamp: number; high: number; low: number; close: number }[]>();
  const pairs = [...new Set(openTheses.map((t: { symbol: string; timeframe: string }) => `${t.symbol}:${t.timeframe}`))] as string[];
  await Promise.all(
    pairs.map(async (pair: string) => {
      const [s, tf] = pair.split(":");
      try {
        // 60 candles covers ~5 hours of 1m and over a week of 4h — far
        // beyond the 5-minute check cadence, so nothing between checks
        // is missed.
        const candles = await getOHLCV(s, tf, 60);
        if (Array.isArray(candles) && candles.length > 0) candlesByPair.set(pair, candles as never);
      } catch {
        // Windowed resolution degrades to spot when candles unavailable.
      }
    })
  );

  return resolveTheses(openTheses as never, prices, candlesByPair);
}

/**
 * V3 BATCHED evaluation — the cron path. Fetches market data ONCE per
 * distinct (symbol, timeframe) pair across ALL users' theses, then runs
 * the identical resolution core. Upstream provider calls are bound by
 * market cardinality (9 symbols × 7 TFs = ≤63 pairs worst case), not by
 * user count — the previous per-user loop re-fetched the same BTC/USD
 * candles once per user and capped at 500 users / 60s. This lifts the
 * ceiling ~30x at unchanged provider cost.
 */
export async function evaluateAllOpenThesesBatched(maxTheses = 5000): Promise<{
  evaluated: number;
  resolved: number;
  thesesRemaining: number;
}> {
  const openTheses = await prisma.thesis.findMany({
    where: { status: "OPEN" },
    orderBy: { checkedAt: { nulls: "first", sort: "asc" } },
    take: maxTheses,
  });
  if (openTheses.length === 0) return { evaluated: 0, resolved: 0, thesesRemaining: 0 };

  // ── One market-data pass, shared by every thesis ─────────────────────
  const symbols = [...new Set(openTheses.map((t: { symbol: string }) => t.symbol))] as string[];
  const prices = new Map<string, number>();
  await Promise.all(
    (symbols as string[]).map(async (s: string) => {
      try {
        const p = await getLivePrice(s);
        if (p && Number.isFinite(p.price)) prices.set(s, p.price);
      } catch {
        // Skip unpriceable symbols this pass.
      }
    })
  );

  const candlesByPair = new Map<string, { timestamp: number; high: number; low: number; close: number }[]>();
  const pairs = [...new Set(openTheses.map((t: { symbol: string; timeframe: string }) => `${t.symbol}:${t.timeframe}`))] as string[];
  // Fetch pairs in modest parallel batches — bounded concurrency keeps
  // us friendly to the shared market-data cache and provider limits.
  const BATCH = 8;
  for (let i = 0; i < pairs.length; i += BATCH) {
    const slice = pairs.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (pair: string) => {
        const [s, tf] = pair.split(":");
        try {
          const candles = await getOHLCV(s, tf, 60);
          if (Array.isArray(candles) && candles.length > 0) candlesByPair.set(pair, candles as never);
        } catch {
          // Degrade to spot resolution for this pair.
        }
      })
    );
  }

  const results = await resolveTheses(openTheses as never, prices, candlesByPair);
  const remaining = await prisma.thesis.count({ where: { status: "OPEN" } });
  return {
    evaluated: results.length,
    resolved: results.filter((r) => r.status !== "OPEN").length,
    thesesRemaining: remaining,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Shared resolution core — used by both the per-user (on-load) and the
// batched (cron) paths. Pure market data in, resolution writes out.
// ─────────────────────────────────────────────────────────────────────────

type MarketDataMaps = {
  prices: Map<string, number>;
  candlesByPair: Map<string, { timestamp: number; high: number; low: number; close: number }[]>;
};

async function resolveTheses(
  openTheses: {
    id: string;
    userId: string;
    symbol: string;
    timeframe: string;
    bias: string;
    target: unknown;
    invalidation: unknown;
    checkedAt: Date | null;
    createdAt: Date;
  }[],
  prices: MarketDataMaps["prices"],
  candlesByPair: MarketDataMaps["candlesByPair"]
): Promise<ThesisEvaluation[]> {
  const results: ThesisEvaluation[] = [];
  const now = Date.now();

  for (const thesis of openTheses) {
    const spotPrice = prices.get(thesis.symbol);
    if (!spotPrice) {
      results.push({ thesisId: thesis.id, status: "OPEN" });
      continue;
    }

    const isLong = thesis.bias === "LONG";
    const target = Number(thesis.target);
    const invalidation = Number(thesis.invalidation);

    // ── Window extremes since the last check (or creation) ──────────
    let windowHigh = spotPrice;
    let windowLow = spotPrice;
    const candles = candlesByPair.get(`${thesis.symbol}:${thesis.timeframe}`);
    if (candles) {
      const sinceMs = thesis.checkedAt ? new Date(thesis.checkedAt).getTime() : new Date(thesis.createdAt).getTime();
      const relevant = candles.filter((c) => c.timestamp >= sinceMs);
      // Guard against clock skew / provider gaps: if nothing falls in
      // the window (stale feed), use the most recent candles.
      const window = relevant.length > 0 ? relevant : candles.slice(-3);
      for (const c of window) {
        if (Number.isFinite(c.high) && c.high > windowHigh) windowHigh = c.high;
        if (Number.isFinite(c.low) && c.low < windowLow) windowLow = c.low;
      }
    }

    // Resolution rules (deterministic, windowed):
    //   LONG:  INVALIDATED if windowLow <= invalidation; HIT if windowHigh >= target
    //   SHORT: INVALIDATED if windowHigh >= invalidation; HIT if windowLow <= target
    // Invalidation takes priority when both zones were touched in the
    // same window — never book a win off a move that also blew the stop.
    let status: ThesisEvaluation["status"] = "OPEN";
    let resolvedPrice: number | undefined;

    const touchedInvalidation = isLong ? windowLow <= invalidation : windowHigh >= invalidation;
    const touchedTarget = isLong ? windowHigh >= target : windowLow <= target;

    if (touchedInvalidation) {
      status = "INVALIDATED";
      resolvedPrice = isLong ? Math.min(windowLow, spotPrice) : Math.max(windowHigh, spotPrice);
    } else if (touchedTarget) {
      status = "HIT";
      resolvedPrice = isLong ? Math.max(windowHigh, spotPrice) : Math.min(windowLow, spotPrice);
    }

    // Expiry horizon: capped at 30 days for all TFs (4x the timeframe
    // window for intraday). Theses are swing objects, not eternal positions.
    if (status === "OPEN") {
      const tfHours: Record<string, number> = {
        "1m": 1 / 60, "5m": 5 / 60, "15m": 0.25, "1h": 1, "4h": 4, "1d": 24, "1W": 168,
      };
      const baseHours = tfHours[thesis.timeframe] ?? 4;
      const maxAgeMs = Math.min(baseHours * 4, 30 * 24) * 60 * 60 * 1000;
      if (now - new Date(thesis.createdAt).getTime() > maxAgeMs) {
        status = "EXPIRED";
        resolvedPrice = spotPrice;
      }
    }

    if (status !== "OPEN") {
      // V2.5: stamp the regime at resolution (best-effort) so the
      // attribution engine can detect regime shifts between creation
      // and resolution — "the market changed" vs "the read was wrong".
      let regimeAtResolution: string | null = null;
      try {
        const { assessRegime } = await import("./market-context");
        const { calculateEMA, calculateVolatility } = await import("./indicators");
        const rCandles = candlesByPair.get(`${thesis.symbol}:${thesis.timeframe}`);
        if (rCandles && rCandles.length >= 20) {
          const closes = rCandles.map((c: { close: number }) => c.close);
          const ema20 = calculateEMA(closes, 20).at(-1) ?? spotPrice;
          const ema50 = rCandles.length >= 50 ? calculateEMA(closes, 50).at(-1) ?? ema20 : ema20;
          const windowSupport = Math.min(...rCandles.slice(-50).map((c: { low: number }) => c.low));
          const windowResistance = Math.max(...rCandles.slice(-50).map((c: { high: number }) => c.high));
          const vol = calculateVolatility(rCandles as never);
          const derivedTrend =
            ema20 > ema50 * 1.001 ? "BULLISH" : ema20 < ema50 * 0.999 ? "BEARISH" : "SIDEWAYS";
          const rAssessment = assessRegime(rCandles as never, {
            trend: derivedTrend,
            volatilityPct: (vol as { standardDeviationPercent?: number }).standardDeviationPercent ?? 1,
            isVolatilitySpike: (vol as { isSpike?: boolean }).isSpike ?? false,
            support: Number.isFinite(windowSupport) ? windowSupport : spotPrice * 0.98,
            resistance: Number.isFinite(windowResistance) ? windowResistance : spotPrice * 1.02,
            currentPrice: spotPrice,
          });
          regimeAtResolution = rAssessment.label;
        }
      } catch {
        // Best-effort stamp; attribution degrades gracefully without it.
      }

      await prisma.thesis.update({
        where: { id: thesis.id },
        data: {
          status,
          resolvedAt: new Date(),
          resolvedPrice: resolvedPrice ?? null,
          checkedAt: new Date(),
          regimeAtResolution,
        },
      });
      await prisma.notification.create({
        data: {
          userId: thesis.userId,
          type: `THESIS_${status}`,
          title:
            status === "HIT"
              ? `Thesis hit: ${thesis.symbol}`
              : status === "INVALIDATED"
                ? `Thesis invalidated: ${thesis.symbol}`
                : `Thesis expired: ${thesis.symbol}`,
          body:
            status === "HIT"
              ? `Your ${thesis.bias} thesis on ${thesis.symbol} (${thesis.timeframe}) reached its target at $${resolvedPrice?.toLocaleString()}. Log the outcome to close the loop.`
              : status === "INVALIDATED"
                ? `Your ${thesis.bias} thesis on ${thesis.symbol} (${thesis.timeframe}) was invalidated at $${resolvedPrice?.toLocaleString()}. Review what the market told you.`
                : `Your ${thesis.bias} thesis on ${thesis.symbol} (${thesis.timeframe}) expired without resolution. Review whether the thesis was time-sensitive.`,
        },
      });
      results.push({ thesisId: thesis.id, status, resolvedPrice });
    } else {
      // Record the check timestamp (throttled write is fine).
      await prisma.thesis.update({
        where: { id: thesis.id },
        data: { checkedAt: new Date() },
      }).catch(() => {});
      results.push({ thesisId: thesis.id, status: "OPEN" });
    }
  }

  return results;
}

/** Record the outcome of a resolved thesis — the loop-closing write.
 *  V2.5: carries the attribution label (user-confirmed, engine-proposed
 *  default) — the core write of the labeled-decision dataset. */
export async function logThesisOutcome(input: {
  userId: string;
  thesisId: string;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "NO_TRADE";
  tookTrade: boolean;
  rMultiple?: number;
  pnl?: number;
  followedPlan?: boolean;
  whatILearned?: string;
  linkedTradeId?: string;
  attribution?: string;
  attributionSource?: string;
  attributionReasoning?: string;
}) {
  const thesis = await prisma.thesis.findFirst({
    where: { id: input.thesisId, userId: input.userId },
    include: { outcome: true },
  });
  if (!thesis) {
    throw Object.assign(new Error("Thesis not found"), { status: 404 });
  }
  if (thesis.outcome) {
    throw Object.assign(new Error("Outcome already logged for this thesis"), { status: 409 });
  }
  if (thesis.status === "OPEN") {
    throw Object.assign(new Error("Thesis is not resolved yet — outcomes can only be logged for resolved theses"), { status: 400 });
  }

  return prisma.thesisOutcome.create({
    data: {
      thesisId: thesis.id,
      userId: input.userId,
      result: input.result,
      tookTrade: input.tookTrade,
      rMultiple: input.rMultiple ?? null,
      pnl: input.pnl ?? null,
      followedPlan: input.followedPlan ?? null,
      whatILearned: input.whatILearned?.slice(0, 2000),
      linkedTradeId: input.linkedTradeId ?? null,
      attribution: (input.attribution as never) ?? null,
      attributionSource: input.attributionSource ?? null,
      attributionReasoning: input.attributionReasoning?.slice(0, 500) ?? null,
    },
  });
}