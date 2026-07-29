import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { getOHLCV } from "./market";
import type { OHLCVCandle, BacktestCompleteResults, BacktestFailedResults } from "./types";

export interface StrategyRule {
  indicatorA: "EMA20" | "EMA50" | "PRICE";
  operator: "CROSSES_ABOVE" | "CROSSES_BELOW" | "GREATER_THAN" | "LESS_THAN";
  indicatorB: "EMA20" | "EMA50" | "PRICE";
}

export interface StrategyDSL {
  entry: StrategyRule;
  exit: StrategyRule;
}

export async function runBacktestJob(backtestId: string, startBalance = 10000) {
  // Atomically claim the job: only transition PENDING → RUNNING. The route
  // creates rows as PENDING; if status is no longer PENDING here, another
  // invocation already claimed it (or it has already finished/failed). Aborting
  // in that case prevents double-execution when the route is called twice
  // rapidly or the background promise is retried. This replaces the prior
  // unconditional update that let two concurrent runs both proceed.
  const claimed = await prisma.backtest.updateMany({
    where: { id: backtestId, status: "PENDING" },
    data: { status: "RUNNING" },
  });
  if (claimed.count === 0) {
    return;
  }

  try {
    const backtest = await prisma.backtest.findUnique({
      where: { id: backtestId },
      include: { strategy: true },
    });

    if (!backtest) throw new Error("Backtest job not found");

    const rules = backtest.strategy.rulesConfig as unknown as StrategyDSL;
    const instrument = backtest.instrument;
    const timeframe = backtest.timeframe;

    // Fetch historical candles from cache/provider with 500 candles limit
    const candles: OHLCVCandle[] = await getOHLCV(instrument, timeframe, 500);

    if (candles.length < 50) {
      throw new Error("Insufficient historical candle data to execute backtest");
    }

    // 1. Compute EMA 20 and EMA 50 indicators on historical candles
    const closePrices = candles.map((c: OHLCVCandle) => c.close);
    const ema20 = computeEMA(closePrices, 20);
    const ema50 = computeEMA(closePrices, 50);

    // Helper to get indicator values at index i
    const getVal = (ind: string, idx: number, price: number) => {
      if (ind === "EMA20") return ema20[idx];
      if (ind === "EMA50") return ema50[idx];
      return price; // PRICE
    };

    // Evaluator helper
    const evaluateRule = (rule: StrategyRule, idx: number, prevIdx: number): boolean => {
      const valA = getVal(rule.indicatorA, idx, closePrices[idx]);
      const valB = getVal(rule.indicatorB, idx, closePrices[idx]);

      if (rule.operator === "GREATER_THAN") return valA > valB;
      if (rule.operator === "LESS_THAN") return valA < valB;

      // Crosses check
      const prevValA = getVal(rule.indicatorA, prevIdx, closePrices[prevIdx]);
      const prevValB = getVal(rule.indicatorB, prevIdx, closePrices[prevIdx]);

      if (rule.operator === "CROSSES_ABOVE") {
        return prevValA <= prevValB && valA > valB;
      }
      if (rule.operator === "CROSSES_BELOW") {
        return prevValA >= prevValB && valA < valB;
      }

      return false;
    };

    const backtestTrades: Array<{
      direction: "LONG";
      entryIndex: number;
      exitIndex: number;
      entryDate: string;
      exitDate: string;
      entryPrice: number;
      exitPrice: number;
      pnl: number;
      pnlPercent: number;
    }> = [];

    let activePosition: { entryIndex: number; entryPrice: number; entryDate: string } | null = null;

    // Walk through historical candles (start at index 50 to let EMAs stabilize)
    for (let i = 50; i < candles.length; i++) {
      const prev = i - 1;
      const candle = candles[i];

      if (!activePosition) {
        // Evaluate Entry Condition
        if (evaluateRule(rules.entry, i, prev)) {
          activePosition = {
            entryIndex: i,
            entryPrice: candle.close,
            entryDate: new Date(candle.timestamp).toLocaleDateString(),
          };
        }
      } else {
        // Evaluate Exit Condition
        if (evaluateRule(rules.exit, i, prev) || i === candles.length - 1) {
          const pnl = candle.close - activePosition.entryPrice;
          const pnlPercent = (pnl / activePosition.entryPrice) * 100;

          backtestTrades.push({
            direction: "LONG",
            entryIndex: activePosition.entryIndex,
            exitIndex: i,
            entryDate: activePosition.entryDate,
            exitDate: new Date(candle.timestamp).toLocaleDateString(),
            entryPrice: activePosition.entryPrice,
            exitPrice: candle.close,
            pnl,
            pnlPercent,
          });

          activePosition = null;
        }
      }
    }

    // 2. Aggregate Results
    let currentEquity = startBalance;
    const equityCurve: Array<{ date: string; equity: number }> = [
      { date: new Date(candles[50].timestamp).toLocaleDateString(), equity: currentEquity },
    ];

    let wins = 0;
    let losses = 0;
    let netProfit = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    for (const bt of backtestTrades) {
      // Sizing assumptions: risk 100% size relative to startBalance
      const multiplier = currentEquity / bt.entryPrice;
      const tradePnLVal = bt.pnl * multiplier;
      currentEquity += tradePnLVal;

      netProfit += tradePnLVal;
      if (tradePnLVal > 0) {
        wins++;
        grossProfit += tradePnLVal;
      } else {
        losses++;
        grossLoss += Math.abs(tradePnLVal);
      }

      equityCurve.push({
        date: bt.exitDate,
        equity: currentEquity,
      });
    }

    const totalTrades = backtestTrades.length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const lossRate = totalTrades > 0 ? losses / totalTrades : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    // Peak-to-trough max drawdown calculation
    let maxDrawdown = 0;
    let peak = startBalance;
    for (const eq of equityCurve) {
      if (eq.equity > peak) {
        peak = eq.equity;
      }
      const drawdown = peak > 0 ? (peak - eq.equity) / peak : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const results: BacktestCompleteResults = {
      trades: backtestTrades,
      equityCurve,
      metrics: {
        totalTrades,
        winRate,
        lossRate,
        profitFactor,
        netProfit,
        maxDrawdown,
        startBalance,
        finalEquity: currentEquity,
      },
    };

    // Update to COMPLETE. profitFactor may be Infinity when there are no
    // losing trades; the Decimal column cannot represent Infinity, so persist
    // null in that case (the resultsJson.metrics.profitFactor retains Infinity
    // for the UI, which serializes to null — semantically "no losses / N/A").
    await prisma.backtest.update({
      where: { id: backtestId },
      data: {
        status: "COMPLETE",
        winRate,
        profitFactor: Number.isFinite(profitFactor) ? profitFactor : null,
        netProfit,
        maxDrawdown,
        // Typed cast to Prisma's JSON input type — the result is a plain
        // JSON-serializable object; this is the documented boundary cast for
        // typed JSON columns (replaces the prior `as any`).
        resultsJson: results as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute backtest";
    console.error("Backtest execution failed:", message);
    const failed: BacktestFailedResults = { error: message };
    await prisma.backtest.update({
      where: { id: backtestId },
      data: {
        status: "FAILED",
        resultsJson: failed as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

// Compute Exponential Moving Average
function computeEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];

  // Simple average for first EMA element
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i] || 0;
  }
  const sma = sum / period;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(prices[i]);
    } else if (i === period - 1) {
      ema.push(sma);
    } else {
      const val = prices[i] * k + ema[i - 1] * (1 - k);
      ema.push(val);
    }
  }

  return ema;
}
