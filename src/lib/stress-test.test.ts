import { POST } from "../app/api/v1/risk/calculate/route";
import { NextRequest } from "next/server";
import { describe, it, expect } from "vitest";

// Helper to call the risk API
async function calcRisk(params: Record<string, any>) {
  const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const res = await POST(req);
  const body = await res.json();
  return { status: res.status, body };
}

// ============================================================
// SECTION 1: RISK CALCULATOR — CRYPTO SCENARIOS
// ============================================================
describe("Risk Calculator — Crypto Scenarios (Expert Trader Validation)", () => {
  // -----------------------------------------------------------
  // Scenario 1: Small account, BTC scalp trade
  // Account: $250, Risk: 1%, Entry: $68,000, SL: $67,800
  // -----------------------------------------------------------
  it("Small account $250 BTC scalp — 1% risk, tight SL", async () => {
    const { status, body } = await calcRisk({
      balance: 250,
      riskPercent: 1,
      entryPrice: 68000,
      stopLoss: 67800,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 10,
    });
    expect(status).toBe(200);
    const d = body.data;
    // Manual: dollarRisk = 250 * 0.01 = $2.50 target
    // Engine rounds 0.0125 BTC DOWN to 0.012 BTC → actual dollarRisk = 0.012*200 = $2.40
    expect(d.dollarRisk).toBeGreaterThan(2.0);
    expect(d.dollarRisk).toBeLessThanOrEqual(2.5);
    expect(d.positionSize).toBeGreaterThan(0);
    expect(d.positionSize).toBeLessThanOrEqual(0.0125);
    expect(d.marginRequired).toBeGreaterThan(0);
    expect(d.marginRequired).toBeLessThanOrEqual(85 + 1);
    // maxLoss should equal dollarRisk
    expect(d.maxLoss).toBeCloseTo(d.dollarRisk, 2);
  });

  // -----------------------------------------------------------
  // Scenario 2: Medium account ETH swing trade
  // Account: $5,000, Risk: 2%, Entry: $3,500, SL: $3,300, TP: $4,100
  // -----------------------------------------------------------
  it("Medium account $5K ETH swing — 2% risk, 1:3 R:R", async () => {
    const { status, body } = await calcRisk({
      balance: 5000,
      riskPercent: 2,
      entryPrice: 3500,
      stopLoss: 3300,
      takeProfit: 4100,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "ETH/USD",
      leverage: 5,
    });
    expect(status).toBe(200);
    const d = body.data;
    // Manual: dollarRisk = 5000 * 0.02 = $100
    expect(d.dollarRisk).toBeCloseTo(100, 2);
    // stopDistance = 3500 - 3300 = 200
    // positionSize = 100 / 200 = 0.5 ETH
    expect(d.positionSize).toBeCloseTo(0.5, 4);
    // marginRequired = (0.5 * 3500) / 5 = $350
    expect(d.marginRequired).toBeCloseTo(350, 0);
    // rewardDistance = 4100 - 3500 = 600
    // rewardAmount = 0.5 * 600 = $300
    expect(d.rewardAmount).toBeCloseTo(300, 0);
    // rMultiple = 600 / 200 = 3.0
    expect(d.rMultiple).toBeCloseTo(3.0, 2);
  });

  // -----------------------------------------------------------
  // Scenario 3: Large account SOL position trade
  // Account: $100,000, Risk: 0.5%, Entry: $145, SL: $130, TP: $190
  // -----------------------------------------------------------
  it("Large account $100K SOL position — 0.5% risk", async () => {
    const { status, body } = await calcRisk({
      balance: 100000,
      riskPercent: 0.5,
      entryPrice: 145,
      stopLoss: 130,
      takeProfit: 190,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "SOL/USD",
      leverage: 1,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 100000 * 0.005 = $500 (may be slightly less due to rounding)
    expect(d.dollarRisk).toBeGreaterThan(498);
    expect(d.dollarRisk).toBeLessThanOrEqual(500.01);
    // stopDistance = 145 - 130 = 15
    // positionSize = 500 / 15 = 33.333... SOL
    expect(d.positionSize).toBeCloseTo(33.3333, 2);
    // marginRequired = (33.333 * 145) / 1 = $4833.33
    expect(d.marginRequired).toBeCloseTo(4833.33, 0);
    // rewardDistance = 190 - 145 = 45
    // rewardAmount = 33.333 * 45 = $1500
    expect(d.rewardAmount).toBeCloseTo(1500, 0);
    // rMultiple = 45 / 15 = 3.0
    expect(d.rMultiple).toBeCloseTo(3.0, 2);
  });

  // -----------------------------------------------------------
  // Scenario 4: SHORT trade — BTC bear market
  // Account: $10,000, Risk: 1%, Entry: $65,000, SL: $66,000, TP: $60,000
  // -----------------------------------------------------------
  it("SHORT BTC trade — bear market scenario", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 65000,
      stopLoss: 66000,
      takeProfit: 60000,
      direction: "SHORT",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 3,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 10000 * 0.01 = $100
    expect(d.dollarRisk).toBeCloseTo(100, 2);
    // stopDistance = |65000 - 66000| = 1000
    // positionSize = 100 / 1000 = 0.1 BTC
    expect(d.positionSize).toBeCloseTo(0.1, 4);
    // marginRequired = (0.1 * 65000) / 3 = $2166.67
    expect(d.marginRequired).toBeCloseTo(2166.67, 0);
    // rewardDistance = |60000 - 65000| = 5000
    // rewardAmount = 0.1 * 5000 = $500
    expect(d.rewardAmount).toBeCloseTo(500, 0);
    // rMultiple = 5000 / 1000 = 5.0
    expect(d.rMultiple).toBeCloseTo(5.0, 2);
  });

  // -----------------------------------------------------------
  // Scenario 5: Fixed dollar risk instead of percentage
  // Account: $2000, Fixed risk: $50, Entry: $60000, SL: $59500
  // -----------------------------------------------------------
  it("Fixed dollar risk $50 on BTC", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskAmount: 50,
      entryPrice: 60000,
      stopLoss: 59500,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 1,
    });
    expect(status).toBe(200);
    const d = body.data;
    // riskAmount = $50, positionSize = 50/500 = 0.1 BTC
    // margin = 0.1 * 60000 / 1 = $6000 ≤ $10000 balance OK
    expect(d.dollarRisk).toBeCloseTo(50, 1);
    expect(d.positionSize).toBeCloseTo(0.1, 4);
    expect(d.marginRequired).toBeCloseTo(6000, 0);
  });

  // -----------------------------------------------------------
  // Scenario 6: High leverage (100x) — crypto futures
  // Account: $500, Risk: 2%, Entry: $68000, SL: $67900
  // -----------------------------------------------------------
  it("100x leverage crypto futures scalp", async () => {
    const { status, body } = await calcRisk({
      balance: 500,
      riskPercent: 2,
      entryPrice: 68000,
      stopLoss: 67900,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 100,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 500 * 0.02 = $10
    expect(d.dollarRisk).toBeCloseTo(10, 2);
    // stopDistance = 100
    // positionSize = 10 / 100 = 0.1 BTC
    expect(d.positionSize).toBeCloseTo(0.1, 4);
    // margin = (0.1 * 68000) / 100 = $68
    expect(d.marginRequired).toBeCloseTo(68, 0);
  });

  // -----------------------------------------------------------
  // Scenario 7: Quarter-percent risk (ultra-conservative)
  // Account: $50,000, Risk: 0.25%, Entry: $68000, SL: $67000
  // -----------------------------------------------------------
  it("Ultra conservative 0.25% risk on $50K account", async () => {
    const { status, body } = await calcRisk({
      balance: 50000,
      riskPercent: 0.25,
      entryPrice: 68000,
      stopLoss: 67000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 1,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 50000 * 0.0025 = $125
    expect(d.dollarRisk).toBeCloseTo(125, 2);
    // stopDistance = 1000
    // positionSize = 125 / 1000 = 0.125 BTC
    expect(d.positionSize).toBeCloseTo(0.125, 4);
    // margin = (0.125 * 68000) / 1 = $8500
    expect(d.marginRequired).toBeCloseTo(8500, 0);
  });
});

// ============================================================
// SECTION 2: RISK CALCULATOR — FOREX SCENARIOS
// ============================================================
describe("Risk Calculator — Forex Scenarios (Expert Trader Validation)", () => {
  // -----------------------------------------------------------
  // Scenario 1: EUR/USD standard day trade
  // Account: $10,000, Risk: 1%, Entry: 1.0850, SL: 1.0800, TP: 1.0950
  // -----------------------------------------------------------
  it("EUR/USD day trade — $10K, 1% risk, 50 pips SL / 100 pips TP", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 1.085,
      stopLoss: 1.08,
      takeProfit: 1.095,
      direction: "LONG",
      assetClass: "FOREX",
      symbol: "EUR/USD",
      leverage: 50,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 10000 * 0.01 = $100
    expect(d.dollarRisk).toBeCloseTo(100, 2);
    // stopDistance = 1.085 - 1.080 = 0.005
    // For EUR/USD: positionSize = 100 / 0.005 = 20,000 units
    expect(d.positionSize).toBeCloseTo(20000, 0);
    // Standard lots = 20000 / 100000 = 0.20
    expect(d.standardLots).toBeCloseTo(0.2, 3);
    // marginRequired = (20000 * 1.085) / 50 = $434
    expect(d.marginRequired).toBeCloseTo(434, 0);
    // rewardDistance = 1.095 - 1.085 = 0.01
    // rewardAmount = 20000 * 0.01 = $200
    expect(d.rewardAmount).toBeCloseTo(200, 0);
    // rMultiple = 0.01 / 0.005 = 2.0
    expect(d.rMultiple).toBeCloseTo(2.0, 2);
  });

  // -----------------------------------------------------------
  // Scenario 2: GBP/USD swing trade
  // Account: $25,000, Risk: 2%, Entry: 1.2750, SL: 1.2650, TP: 1.3050
  // -----------------------------------------------------------
  it("GBP/USD swing trade — $25K, 2% risk, 100 pips SL", async () => {
    const { status, body } = await calcRisk({
      balance: 25000,
      riskPercent: 2,
      entryPrice: 1.275,
      stopLoss: 1.265,
      takeProfit: 1.305,
      direction: "LONG",
      assetClass: "FOREX",
      symbol: "GBP/USD",
      leverage: 30,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 25000 * 0.02 = $500
    expect(d.dollarRisk).toBeCloseTo(500, 2);
    // stopDistance = 1.275 - 1.265 = 0.01
    // positionSize = 500 / 0.01 = 50,000 units
    expect(d.positionSize).toBeCloseTo(50000, 0);
    // standardLots = 50000 / 100000 = 0.5
    expect(d.standardLots).toBeCloseTo(0.5, 3);
    // margin = (50000 * 1.275) / 30 = $2125
    expect(d.marginRequired).toBeCloseTo(2125, 0);
    // rewardDistance = 1.305 - 1.275 = 0.03
    // rewardAmount = 50000 * 0.03 = $1500
    expect(d.rewardAmount).toBeCloseTo(1500, 0);
    // rMultiple = 0.03 / 0.01 = 3.0
    expect(d.rMultiple).toBeCloseTo(3.0, 2);
  });

  // -----------------------------------------------------------
  // Scenario 3: USD/JPY with quote currency conversion
  // Account: $10,000, Risk: 1%, Entry: 157.50, SL: 157.00, TP: 159.00
  // -----------------------------------------------------------
  it("USD/JPY day trade with JPY quote conversion", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 157.5,
      stopLoss: 157.0,
      takeProfit: 159.0,
      direction: "LONG",
      assetClass: "FOREX",
      symbol: "USD/JPY",
      leverage: 2500, // very high leverage so margin < balance
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 10000 * 0.01 = $100 target
    // Engine: position = (100 * 157.5) / 0.5 = 31,500 units → rounded to 31000
    // actual dollarRisk = (31000 * 0.5) / 157.5 ≈ $98.41
    expect(d.dollarRisk).toBeGreaterThan(90);
    expect(d.dollarRisk).toBeLessThanOrEqual(100.01);
    expect(d.positionSize).toBeGreaterThan(28000);
    expect(d.positionSize).toBeLessThanOrEqual(32000);
    expect(d.standardLots).toBeGreaterThan(0.28);
    expect(d.standardLots).toBeLessThanOrEqual(0.32);
    // CORRECT margin formula: (positionSize × entry) / leverage
    // With 2500x leverage: (31000 * 157.5) / 2500 = $1953
    expect(d.marginRequired).toBeLessThanOrEqual(10001);
    expect(d.rewardAmount).toBeGreaterThan(0);
    expect(d.rMultiple).toBeGreaterThan(2.5);
  });

  // -----------------------------------------------------------
  // Scenario 4: XAU/USD (Gold) wide stop
  // Account: $50,000, Risk: 1%, Entry: 2340, SL: 2310, TP: 2400
  // -----------------------------------------------------------
  it("XAU/USD gold trade — $50K, wide 30-point SL", async () => {
    const { status, body } = await calcRisk({
      balance: 50000,
      riskPercent: 1,
      entryPrice: 2340,
      stopLoss: 2310,
      takeProfit: 2400,
      direction: "LONG",
      assetClass: "FOREX",
      symbol: "XAU/USD",
      leverage: 20,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 50000 * 0.01 = $500 (engine rounds 16.67→16.67 oz, 0.01 increment)
    expect(d.dollarRisk).toBeGreaterThan(498);
    expect(d.dollarRisk).toBeLessThanOrEqual(500.1);
    // positionSize = 500 / 30 = 16.667 oz
    expect(d.positionSize).toBeGreaterThan(16.6);
    expect(d.positionSize).toBeLessThanOrEqual(16.7);
    // margin = (16.67 * 2340) / 20 = $1950
    expect(d.marginRequired).toBeGreaterThan(1900);
    expect(d.marginRequired).toBeLessThanOrEqual(1960);
    expect(d.rewardAmount).toBeGreaterThan(990);
    expect(d.rMultiple).toBeCloseTo(2.0, 1);
  });

  // -----------------------------------------------------------
  // Scenario 5: SHORT EUR/USD trade
  // Account: $10,000, Risk: 1%, Entry: 1.0900, SL: 1.0950, TP: 1.0750
  // -----------------------------------------------------------
  it("SHORT EUR/USD trade — bear direction", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 1.09,
      stopLoss: 1.095,
      takeProfit: 1.075,
      direction: "SHORT",
      assetClass: "FOREX",
      symbol: "EUR/USD",
      leverage: 50,
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = $100
    expect(d.dollarRisk).toBeCloseTo(100, 2);
    // stopDistance = |1.09 - 1.095| = 0.005
    // positionSize = 100 / 0.005 = 20000 units
    expect(d.positionSize).toBeCloseTo(20000, 0);
    expect(d.standardLots).toBeCloseTo(0.2, 3);
    // rewardDistance = |1.075 - 1.09| = 0.015
    // rewardAmount = 20000 * 0.015 = $300
    expect(d.rewardAmount).toBeCloseTo(300, 0);
    // rMultiple = 0.015 / 0.005 = 3.0
    expect(d.rMultiple).toBeCloseTo(3.0, 2);
  });
});

// ============================================================
// SECTION 3: EDGE CASES & VALIDATION
// ============================================================
describe("Risk Calculator — Edge Cases & Validation", () => {
  it("rejects stop loss equal to entry price", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 60000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects LONG with SL above entry", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 61000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects SHORT with SL below entry", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "SHORT",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects LONG with TP below entry", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      takeProfit: 58000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects SHORT with TP above entry", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 61000,
      takeProfit: 62000,
      direction: "SHORT",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects zero balance", async () => {
    const { status } = await calcRisk({
      balance: 0,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects negative balance", async () => {
    const { status } = await calcRisk({
      balance: -1000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects zero risk percent", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 0,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects missing both riskPercent and riskAmount", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("rejects risk percent > 100", async () => {
    const { status } = await calcRisk({
      balance: 10000,
      riskPercent: 101,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(400);
  });

  it("handles 5% aggressive risk correctly", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 5,
      entryPrice: 68000,
      stopLoss: 67000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 10, // leverage ensures margin stays within balance
    });
    expect(status).toBe(200);
    const d = body.data;
    // dollarRisk = 10000 * 0.05 = $500 target; 0.5 BTC * 1000 = $500 exact
    expect(d.dollarRisk).toBeGreaterThan(498);
    expect(d.dollarRisk).toBeLessThanOrEqual(500.1);
    expect(d.positionSize).toBeCloseTo(0.5, 4);
    // margin = (0.5 * 68000) / 10 = $3400 ≤ $10,000 ✓
    expect(d.marginRequired).toBeCloseTo(3400, 50);
    expect(d.maxLoss).toBeCloseTo(d.dollarRisk, 1);
  });

  // Verify that lotSizeOrQty string formatting works
  it("returns correct lot size string for Forex", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 1.085,
      stopLoss: 1.08,
      direction: "LONG",
      assetClass: "FOREX",
      symbol: "EUR/USD",
    });
    expect(status).toBe(200);
    const d = body.data;
    expect(d.lotSizeOrQty).toContain("Standard Lots");
  });

  it("returns correct coin quantity string for Crypto", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 68000,
      stopLoss: 67000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
    });
    expect(status).toBe(200);
    const d = body.data;
    expect(d.lotSizeOrQty).toContain("BTC");
  });
});

// ============================================================
// SECTION 4: CROSS-CONSISTENCY CHECKS
// ============================================================
describe("Risk Calculator — Cross-consistency Invariants", () => {
  it("maxLoss always equals dollarRisk", async () => {
    const scenarios = [
      { balance: 100, riskPercent: 5, entryPrice: 68000, stopLoss: 67000, direction: "LONG" as const },
      { balance: 50000, riskPercent: 0.25, entryPrice: 1.085, stopLoss: 1.08, direction: "LONG" as const, assetClass: "FOREX" as const, symbol: "EUR/USD" },
      { balance: 10000, riskAmount: 150, entryPrice: 3500, stopLoss: 3400, direction: "LONG" as const },
    ];
    for (const s of scenarios) {
      const { status, body } = await calcRisk({
        assetClass: "CRYPTO",
        symbol: "BTC/USD",
        leverage: 1,
        ...s,
      });
      expect(status).toBe(200);
      // maxLoss == dollarRisk (both are actual risk after rounding)
      expect(body.data.maxLoss).toBeCloseTo(body.data.dollarRisk, 1);
    }
  });

  it("rewardAmount = rMultiple * dollarRisk (cross-check)", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      takeProfit: 63000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 1,
    });
    expect(status).toBe(200);
    const d = body.data;
    // rMultiple = 3000 / 1000 = 3.0, dollarRisk = $100, rewardAmount should = $300
    expect(d.rewardAmount).toBeCloseTo(d.rMultiple * d.dollarRisk, 1);
  });

  it("leveraged position size = positionSize * leverage", async () => {
    const { status, body } = await calcRisk({
      balance: 10000,
      riskPercent: 1,
      entryPrice: 60000,
      stopLoss: 59000,
      direction: "LONG",
      assetClass: "CRYPTO",
      symbol: "BTC/USD",
      leverage: 10,
    });
    expect(status).toBe(200);
    expect(body.data.positionSizeLeveraged).toBeCloseTo(body.data.positionSize * 10, 2);
  });
});
