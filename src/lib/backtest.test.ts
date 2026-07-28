import { runBacktestJob } from "./backtest-service";
import { prisma } from "./prisma";
import { describe, it, expect, vi } from "vitest";

// Deterministic synthetic OHLCV so the backtester engine is unit-tested without
// live network fetches (Binance/Twelve Data/Coinbase). The slow sine wave
// around a rising drift guarantees EMA20/EMA50 crossovers occur and produces a
// stable, non-NaN equity curve. Without this mock the tests intermittently
// timed out under parallel suite load while waiting on real provider fetches.
vi.mock("@/lib/market", () => {
  const makeCandles = (count: number) => {
    const candles = [];
    let price = 100;
    for (let i = 0; i < count; i++) {
      const close = price + Math.sin(i / 8) * 5 + 0.5;
      candles.push({
        timestamp: Date.now() - (count - i) * 86_400_000,
        open: price,
        high: Math.max(price, close) + 1,
        low: Math.min(price, close) - 1,
        close,
        volume: 1000,
      });
      price = close;
    }
    return candles;
  };
  return { getOHLCV: async () => makeCandles(500) };
});

describe("Strategy Backtester Engine", () => {
  it("executes backtest job and aggregates metrics correctly", async () => {
    // 1. Create a strategy crossover ruleset in mock DB
    const strategy = await prisma.strategy.create({
      data: {
        userId: "mock-user-123",
        name: "Test Crossover Strategy",
        description: "Test EMA cross logic",
        rulesConfig: {
          entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
          exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" }
        }
      }
    });

    // 2. Create a pending backtest record
    const backtest = await prisma.backtest.create({
      data: {
        userId: "mock-user-123",
        strategyId: strategy.id,
        instrument: "BTC/USD",
        timeframe: "1d",
        dateFrom: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        dateTo: new Date(),
        resultsJson: {} as any
      }
    });

    // 3. Run the backtest job (starting balance $5,000)
    await runBacktestJob(backtest.id, 5000);

    // 4. Retrieve backtest results
    const result = await prisma.backtest.findFirst({
      where: { id: backtest.id, userId: "mock-user-123" }
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    expect(result!.winRate).toBeDefined();
    expect(result!.profitFactor).toBeDefined();
    expect(result!.netProfit).toBeDefined();
    expect(result!.maxDrawdown).toBeDefined();

    const resultsJson = result!.resultsJson as any;
    expect(resultsJson.metrics).toBeDefined();
    expect(resultsJson.metrics.startBalance).toBe(5000);
    expect(resultsJson.metrics.totalTrades).toBeGreaterThanOrEqual(0);
    expect(resultsJson.equityCurve.length).toBeGreaterThan(0);
    expect(resultsJson.equityCurve[0].equity).toBe(5000);
  });
});
