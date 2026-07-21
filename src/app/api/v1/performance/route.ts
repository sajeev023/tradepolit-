import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";
import type { PerformanceMetrics } from "@/lib/types";

const DEFAULT_METRICS: PerformanceMetrics = {
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  expectancy: 0,
  averageRR: 0,
  averageWin: 0,
  averageLoss: 0,
  maxDrawdown: 0,
  sharpeRatio: 0,
  bestAsset: null,
  worstAsset: null,
  longestWinStreak: 0,
  longestLoseStreak: 0,
  averageTradeDuration: 0,
  totalPnL: 0,
};

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) {
      return error ?? unauthorizedError();
    }

    const performance = await prisma.performance.findUnique({
      where: { userId: user.id },
    });

    if (!performance) {
      return successResponse({
        equityCurve: [],
        metrics: DEFAULT_METRICS,
        computedAt: new Date().toISOString(),
      });
    }

    return successResponse({
      equityCurve: performance.equityCurve,
      metrics: performance.metricsJson,
      computedAt: performance.computedAt
        ? new Date(performance.computedAt).toISOString()
        : new Date().toISOString(),
    });
  } catch (error) {
    console.error("Performance API error:", error);
    return internalError("Failed to fetch performance analytics");
  }
}
