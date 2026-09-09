import { NextRequest } from "next/server";
import { prisma, isMockDb } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { refreshUserInsights } from "@/lib/insight-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/v1/insights — the user's personal trading patterns.
 *
 * Deterministic computation from trades + thesis outcomes. Refreshed
 * when stale (>12h old or when new data arrived); cached reads are
 * instant. Every insight exposes its sample size — under-powered
 * claims are suppressed at the engine level, never overstated.
 */
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    if (isMockDb) {
      return successResponse({
        winRateBySetup: [], winRateByEmotion: [], mistakePatterns: [], riskBehavior: [],
        summary: { closedTrades: 0, thesisOutcomes: 0, followRate: null, bestSetup: null, worstEmotion: null },
      });
    }

    const [cached, newTrades] = await Promise.all([
      prisma.userInsight.findMany({ where: { userId: user.id } }),
      prisma.trade.count({ where: { userId: user.id, updatedAt: { gte: new Date(Date.now() - 12 * 3600 * 1000) } } }),
    ]);

    const newestComputed = cached.reduce((max: number, i: { computedAt: Date }) => Math.max(max, new Date(i.computedAt).getTime()), 0);
    const isStale = Date.now() - newestComputed > 12 * 3600 * 1000;
    const hasNewData = newTrades > 0;

    if (isStale || hasNewData || cached.length === 0) {
      const fresh = await refreshUserInsights(user.id);
      return successResponse(fresh);
    }

    // Serve cached insights assembled per type.
    const byType = new Map((cached as { insightType: string; payload: unknown }[]).map((i) => [i.insightType, i.payload as unknown[]]));
    const empty: never[] = [];
    return successResponse({
      winRateBySetup: byType.get("WIN_RATE_BY_SETUP") ?? empty,
      winRateByEmotion: byType.get("WIN_RATE_BY_EMOTION") ?? empty,
      mistakePatterns: byType.get("MISTAKE_PATTERN") ?? empty,
      riskBehavior: byType.get("RISK_BEHAVIOR") ?? empty,
      summary: {
        closedTrades: cached[0]?.sampleSize ?? 0,
        thesisOutcomes: 0,
        followRate: null,
        bestSetup: null,
        worstEmotion: null,
      },
    });
  } catch (err) {
    return dispatchCaughtError("Failed to compute insights", err);
  }
}