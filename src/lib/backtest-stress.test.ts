import { describe, it, expect } from "vitest";
import { prisma } from "./prisma";
import { runBacktestJob } from "./backtest-service";

// ============================================================
// BACKTESTER ENGINE — EXPERT VALIDATION
// ============================================================
describe("Backtester Engine — Expert Trader Validation", () => {

  // Helper to create strategy + backtest and run it
  async function createAndRun(opts: {
    userId: string;
    name: string;
    entry: { indicatorA: string; operator: string; indicatorB: string };
    exit: { indicatorA: string; operator: string; indicatorB: string };
    instrument: string;
    timeframe: string;
    startBalance: number;
  }) {
    const strategy = await prisma.strategy.create({
      data: {
        userId: opts.userId,
        name: opts.name,
        description: `${opts.name} test`,
        rulesConfig: { entry: opts.entry, exit: opts.exit },
      },
    });

    const backtest = await prisma.backtest.create({
      data: {
        userId: opts.userId,
        strategyId: strategy.id,
        instrument: opts.instrument,
        timeframe: opts.timeframe,
        dateFrom: new Date(Date.now() - 365 * 24 * 3600 * 1000),
        dateTo: new Date(),
        resultsJson: {} as any,
      },
    });

    await runBacktestJob(backtest.id, opts.startBalance);

    // Defensive: in the in-memory mock, concurrent full-suite runs can occasionally
    // read a record before the final status update has propagated. Poll briefly.
    let result = await prisma.backtest.findFirst({
      where: { id: backtest.id, userId: opts.userId },
    });
    let attempts = 0;
    while (result?.status === "PENDING" && attempts < 10) {
      await new Promise((r) => setTimeout(r, 50));
      result = await prisma.backtest.findFirst({
        where: { id: backtest.id, userId: opts.userId },
      });
      attempts++;
    }

    return result;
  }

  // -----------------------------------------------------------
  // Test 1: Classic EMA 20/50 Crossover on BTC
  // -----------------------------------------------------------
  it("EMA 20/50 crossover on BTC/USD — produces valid metrics", async () => {
    const result = await createAndRun({
      userId: "stress-bt-1",
      name: "EMA 20/50 Crossover BTC",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "BTC/USD",
      timeframe: "1d",
      startBalance: 10000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");

    const json = result!.resultsJson as any;
    const m = json.metrics;

    // Metrics sanity checks
    expect(m.startBalance).toBe(10000);
    expect(m.totalTrades).toBeGreaterThanOrEqual(0);
    expect(m.winRate).toBeGreaterThanOrEqual(0);
    expect(m.winRate).toBeLessThanOrEqual(1);
    expect(m.lossRate).toBeGreaterThanOrEqual(0);
    expect(m.lossRate).toBeLessThanOrEqual(1);
    // winRate + lossRate must sum to 1 (or both 0 for no trades)
    if (m.totalTrades > 0) {
      expect(m.winRate + m.lossRate).toBeCloseTo(1.0, 5);
    }
    expect(m.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(m.maxDrawdown).toBeLessThanOrEqual(1);
    expect(m.finalEquity).toBeGreaterThan(0);

    // Equity curve consistency
    expect(json.equityCurve[0].equity).toBe(10000);
    const lastEquity = json.equityCurve[json.equityCurve.length - 1].equity;
    expect(lastEquity).toBeCloseTo(m.finalEquity, 0);

    expect(m.profitFactor).toBeGreaterThanOrEqual(0);
    expect(m.netProfit).toBeCloseTo(m.finalEquity - m.startBalance, 0);

    // Each trade structure
    for (const t of json.trades) {
      expect(t.entryPrice).toBeGreaterThan(0);
      expect(t.exitPrice).toBeGreaterThan(0);
      expect(typeof t.pnl).toBe("number");
      expect(typeof t.pnlPercent).toBe("number");
      expect(t.direction).toBe("LONG");
      expect(t.pnlPercent).toBeCloseTo((t.pnl / t.entryPrice) * 100, 2);
    }
  });

  // -----------------------------------------------------------
  // Test 2: Different starting balances produce proportional results
  // -----------------------------------------------------------
  it("Different starting balances produce proportional results", async () => {
    const r1 = await createAndRun({
      userId: "stress-bt-2a",
      name: "Balance Test 1K",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "ETH/USD",
      timeframe: "1d",
      startBalance: 1000,
    });

    const r2 = await createAndRun({
      userId: "stress-bt-2b",
      name: "Balance Test 100K",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "ETH/USD",
      timeframe: "1d",
      startBalance: 100000,
    });

    const m1 = (r1!.resultsJson as any).metrics;
    const m2 = (r2!.resultsJson as any).metrics;

    // Win rate and total trades should be identical
    expect(m1.winRate).toBeCloseTo(m2.winRate, 5);
    expect(m1.totalTrades).toBe(m2.totalTrades);
    // Max drawdown percentage should be identical
    expect(m1.maxDrawdown).toBeCloseTo(m2.maxDrawdown, 4);
  });

  // -----------------------------------------------------------
  // Test 3: PRICE > EMA20 momentum strategy
  // -----------------------------------------------------------
  it("PRICE > EMA20 momentum strategy produces valid trades", async () => {
    const result = await createAndRun({
      userId: "stress-bt-3",
      name: "Momentum PRICE > EMA20",
      entry: { indicatorA: "PRICE", operator: "CROSSES_ABOVE", indicatorB: "EMA20" },
      exit: { indicatorA: "PRICE", operator: "CROSSES_BELOW", indicatorB: "EMA20" },
      instrument: "SOL/USD",
      timeframe: "1h",
      startBalance: 5000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.totalTrades).toBeGreaterThanOrEqual(0);
    expect(json.equityCurve.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // Test 4: Counter-trend EMA50 > PRICE mean reversion
  // -----------------------------------------------------------
  it("Counter-trend EMA50 > PRICE mean reversion strategy", async () => {
    const result = await createAndRun({
      userId: "stress-bt-4",
      name: "Mean Reversion EMA50",
      entry: { indicatorA: "EMA50", operator: "CROSSES_ABOVE", indicatorB: "PRICE" },
      exit: { indicatorA: "EMA50", operator: "CROSSES_BELOW", indicatorB: "PRICE" },
      instrument: "BTC/USD",
      timeframe: "4h",
      startBalance: 25000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.startBalance).toBe(25000);
    expect(json.equityCurve[0].equity).toBe(25000);
    expect(json.metrics.finalEquity).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // Test 5: GREATER_THAN operator (non-cross)
  // -----------------------------------------------------------
  it("GREATER_THAN / LESS_THAN non-cross operators work correctly", async () => {
    const result = await createAndRun({
      userId: "stress-bt-5",
      name: "EMA Trend Non-Cross",
      entry: { indicatorA: "EMA20", operator: "GREATER_THAN", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "LESS_THAN", indicatorB: "EMA50" },
      instrument: "BTC/USD",
      timeframe: "1d",
      startBalance: 10000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.totalTrades).toBeGreaterThanOrEqual(0);
  });

  // -----------------------------------------------------------
  // Test 6: XAU/USD (Gold) Forex backtest
  // -----------------------------------------------------------
  it("Forex XAU/USD backtest completes successfully", async () => {
    const result = await createAndRun({
      userId: "stress-bt-6",
      name: "Gold EMA Cross",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "XAU/USD",
      timeframe: "1d",
      startBalance: 50000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.startBalance).toBe(50000);
    expect(json.metrics.finalEquity).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // Test 7: Small $100 account — no NaN or Infinity
  // -----------------------------------------------------------
  it("Small $100 account backtest doesn't produce NaN or Infinity", async () => {
    const result = await createAndRun({
      userId: "stress-bt-7",
      name: "Small Account Stress",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "BTC/USD",
      timeframe: "1d",
      startBalance: 100,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;

    // No NaN or Infinity in any metric
    expect(Number.isFinite(json.metrics.netProfit)).toBe(true);
    expect(Number.isFinite(json.metrics.winRate)).toBe(true);
    expect(Number.isFinite(json.metrics.profitFactor)).toBe(true);
    expect(Number.isFinite(json.metrics.maxDrawdown)).toBe(true);
    expect(Number.isFinite(json.metrics.finalEquity)).toBe(true);

    for (const eq of json.equityCurve) {
      expect(Number.isFinite(eq.equity)).toBe(true);
    }
  });

  // -----------------------------------------------------------
  // Test 8: 15-minute timeframe scalping
  // -----------------------------------------------------------
  it("15-minute timeframe scalping strategy runs correctly", async () => {
    const result = await createAndRun({
      userId: "stress-bt-8",
      name: "Scalping 15m EMA Cross",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "ETH/USD",
      timeframe: "15m",
      startBalance: 2000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.startBalance).toBe(2000);
  });

  // -----------------------------------------------------------
  // Test 9: EUR/USD Forex backtest
  // -----------------------------------------------------------
  it("EUR/USD Forex backtest works correctly", async () => {
    const result = await createAndRun({
      userId: "stress-bt-9",
      name: "EUR/USD EMA Cross",
      entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
      exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
      instrument: "EUR/USD",
      timeframe: "1d",
      startBalance: 10000,
    });

    expect(result).not.toBeNull();
    expect(result!.status).toBe("COMPLETE");
    const json = result!.resultsJson as any;
    expect(json.metrics.startBalance).toBe(10000);
    expect(json.metrics.finalEquity).toBeGreaterThan(0);
  });
});
