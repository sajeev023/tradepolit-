import { prisma } from "@/lib/prisma";
import type { PerformanceMetrics } from "./types";
import { memoryDb } from "./prisma-mock";

// Helper to compute standard deviation
function getStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export async function recomputeUserPerformance(userId: string) {
  // If using in-memory mock database
  const isLocalhostDb =
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("mockproject");

  if (isLocalhostDb) {
    memoryDb.recomputePerformance();
    return memoryDb.performance;
  }

  // Fetch all closed trades for this user sorted chronologically by close time
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: "CLOSED",
      closedAt: { not: null },
    },
    orderBy: { closedAt: "asc" },
  });

  if (trades.length === 0) {
    // Save empty performance entry
    const emptyMetrics: PerformanceMetrics = {
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

    return await prisma.performance.upsert({
      where: { userId },
      update: {
        equityCurve: [],
        metricsJson: emptyMetrics as any,
        computedAt: new Date(),
      },
      create: {
        userId,
        equityCurve: [],
        metricsJson: emptyMetrics as any,
        computedAt: new Date(),
      },
    });
  }

  let runningPnL = 0;
  const equityCurve: Array<{ date: string; pnl: number }> = [];
  const pnlList: number[] = [];

  // Metrics parameters
  let winsCount = 0;
  let lossesCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalRR = 0;
  let totalDurationMs = 0;

  // Streak counters
  let currentWinStreak = 0;
  let currentLoseStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;

  // Asset grouping for best/worst asset calculation
  const assetPnL: Record<string, number> = {};

  // For drawdown calculations
  let peakEquity = 0;
  let maxDrawdown = 0;

  for (const trade of trades) {
    const pnl = Number(trade.pnl || 0);
    pnlList.push(pnl);
    runningPnL += pnl;

    // Equity Curve point
    equityCurve.push({
      date: trade.closedAt!.toLocaleDateString(),
      pnl: runningPnL,
    });

    // Drawdown check
    if (runningPnL > peakEquity) {
      peakEquity = runningPnL;
    }
    const drawdown = peakEquity - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    // Asset aggregation
    assetPnL[trade.instrument] = (assetPnL[trade.instrument] || 0) + pnl;

    // R-Multiple
    if (trade.rMultiple) {
      totalRR += Number(trade.rMultiple);
    }

    // Win/Loss counting
    if (pnl > 0) {
      winsCount++;
      grossProfit += pnl;
      currentWinStreak++;
      currentLoseStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      lossesCount++;
      grossLoss += Math.abs(pnl);
      currentLoseStreak++;
      currentWinStreak = 0;
      if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
    }

    // Duration calculation
    const duration = trade.closedAt!.getTime() - trade.openedAt.getTime();
    totalDurationMs += duration;
  }

  // Find best and worst assets
  let bestAsset: string | null = null;
  let worstAsset: string | null = null;
  let maxAssetPnL = -Infinity;
  let minAssetPnL = Infinity;

  for (const [asset, pnl] of Object.entries(assetPnL)) {
    if (pnl > maxAssetPnL) {
      maxAssetPnL = pnl;
      bestAsset = asset;
    }
    if (pnl < minAssetPnL) {
      minAssetPnL = pnl;
      worstAsset = asset;
    }
  }

  // Expectancy & stats
  const totalTrades = trades.length;
  const winRate = winsCount / totalTrades;
  // Profit factor is a ratio (grossProfit / grossLoss). When there are no
  // losing trades, the prior code returned the raw dollar grossProfit (e.g.
  // 1250), which downstream consumers misread as a ratio. Use Infinity when
  // there are wins but no losses (the mathematically correct ratio), and 0
  // when there are no trades at all. JSON.stringify(Infinity) → null, which
  // the dashboard treats as "no losses / N/A".
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const expectancy = runningPnL / totalTrades;
  const averageWin = winsCount > 0 ? grossProfit / winsCount : 0;
  const averageLoss = lossesCount > 0 ? grossLoss / lossesCount : 0;
  const averageRR = totalRR / totalTrades;
  const averageTradeDuration = totalDurationMs / totalTrades / 1000; // in seconds

  // Sharpe Ratio = (expectancy / SD of PNLs)
  const sdPnL = getStandardDeviation(pnlList);
  const sharpeRatio = sdPnL > 0 ? expectancy / sdPnL : 0;

  const metrics: PerformanceMetrics = {
    totalTrades,
    winRate,
    profitFactor,
    expectancy,
    averageRR,
    averageWin,
    averageLoss,
    maxDrawdown,
    sharpeRatio,
    bestAsset,
    worstAsset,
    longestWinStreak: maxWinStreak,
    longestLoseStreak: maxLoseStreak,
    averageTradeDuration,
    totalPnL: runningPnL,
  };

  return await prisma.performance.upsert({
    where: { userId },
    update: {
      equityCurve: equityCurve as any,
      metricsJson: metrics as any,
      computedAt: new Date(),
    },
    create: {
      userId,
      equityCurve: equityCurve as any,
      metricsJson: metrics as any,
      computedAt: new Date(),
    },
  });
}
