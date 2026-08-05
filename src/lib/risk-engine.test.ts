import { describe, it, expect } from "vitest";
import { calculate, validateInputs } from "./risk-engine";

const approx = (val: number | null | undefined, expected: number, tol = 0.01) => {
  expect(val).not.toBeNull();
  expect(Math.abs((val as number) - expected)).toBeLessThan(tol);
};

// --- BTC/USD ------------------------------------------------------------------
describe("BTC/USD � Crypto Spot (Leverage 1x)", () => {
  it("scenario 1: Balance $10k, Entry $62k, Stop $61.5k, Risk 1%", () => {
    // risk_capital = $100, stop = $500, position = 0.2 BTC
    // margin = 0.2 * 62000 / 1 = $12,400 > balance ? warned + capped
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61500,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    // position capped to balance / entry = 10000 / 62000 � 0.161 BTC
    approx(result.positionSize, 0.161, 0.005);
    expect(result.marginRequired).toBeLessThanOrEqual(10001);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.standardLots).toBeNull();
  });

  it("scenario 2: Balance $10k, Entry $62k, Stop $61k, Risk 1%, TP $65k", () => {
    // risk = $100, stop = $1000, position = 0.1 BTC, margin = $6200 < $10k OK
    // reward = 0.1 * 3000 = $300, R:R = 3.0
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000, takeProfit: 65000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    approx(result.positionSize, 0.1);
    approx(result.dollarRisk, 100);
    approx(result.rewardAmount!, 300);
    approx(result.rMultiple!, 3.0);
    expect(result.warnings).toHaveLength(0);
  });

  it("scenario 3: SHORT trade, stop above entry", () => {
    // Entry $62k, Stop $63k (SHORT), risk 2%, Balance $5000
    // risk = $100, stop_distance = $1000, position = 0.1 BTC
    // margin = 0.1 * 62000 = $6200 > $5000 ? warned + capped
    const result = calculate({
      balance: 5000, riskPercent: 2,
      entryPrice: 62000, stopLoss: 63000,
      leverage: 1, direction: "SHORT",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(result.positionSize).toBeGreaterThan(0);
    expect(result.marginRequired).toBeLessThanOrEqual(5001);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("scenario 4: Leverage 2x, Balance $5k, MAX mode", () => {
    // buying_power = $10,000, max_position = 10000 / 62000 = 0.161 BTC
    // margin = (0.161 � 62000) / 2 = $4991 = $5000 ?
    const result = calculate({
      balance: 5000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 2, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
      mode: "MAX",
    });
    expect(result.mode).toBe("MAX");
    expect(result.positionSize).toBeGreaterThan(0.15);
    expect(result.marginRequired).toBeLessThanOrEqual(5001);
  });

  it("scenario 5: MIN mode returns 0.001 BTC", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
      mode: "MIN",
    });
    expect(result.mode).toBe("MIN");
    approx(result.positionSize, 0.001);
  });

  it("scenario 6: fixed dollar risk amount", () => {
    // riskAmount = $50, stop = $1000, position = 0.05 BTC
    const result = calculate({
      balance: 10000, riskAmount: 50,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    approx(result.positionSize, 0.05);
    approx(result.dollarRisk, 50);
  });
});

// --- ETH/USD ------------------------------------------------------------------
describe("ETH/USD � Crypto Spot", () => {
  it("Balance $2k, Entry $3.2k, Stop $3.1k, Risk 2%", () => {
    // risk = $40, stop = $100, position = 0.4 ETH
    // margin = 0.4 � 3200 = $1280 < $2000 ?
    const result = calculate({
      balance: 2000, riskPercent: 2,
      entryPrice: 3200, stopLoss: 3100,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "ETH/USD",
    });
    approx(result.positionSize, 0.4);
    approx(result.dollarRisk, 40);
    expect(result.warnings).toHaveLength(0);
  });

  it("MIN mode returns 0.01 ETH", () => {
    const result = calculate({
      balance: 2000, riskPercent: 2,
      entryPrice: 3200, stopLoss: 3100,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "ETH/USD",
      mode: "MIN",
    });
    approx(result.positionSize, 0.01);
  });
});

// --- EUR/USD ------------------------------------------------------------------
describe("EUR/USD � Forex (30x leverage)", () => {
  it("Balance $10k, Entry 1.0850, Stop 1.0800, Risk 1%, 30x leverage", () => {
    // risk = $100, stop = 0.005 (50 pips)
    // position_units = 100 / 0.005 = 20,000 units = 0.2 standard lots
    // pip_value = 20000 � 0.0001 = $2.00 per pip
    // margin = (20000 � 1.0850) / 30 = $723.33
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 1.0850, stopLoss: 1.0800,
      leverage: 30, direction: "LONG",
      assetClass: "FOREX", symbol: "EUR/USD",
    });
    approx(result.positionSize, 20000, 1000);
    approx(result.dollarRisk, 100, 5);
    approx(result.marginRequired, 723.33, 10);
    approx(result.standardLots!, 0.2, 0.02);
    approx(result.pipValue, 2.0, 0.5);
    expect(result.warnings).toHaveLength(0);
  });

  it("risk capped at 100% returns warning", () => {
    const result = calculate({
      balance: 1000, riskPercent: 110,
      entryPrice: 1.0850, stopLoss: 1.0800,
      leverage: 1, direction: "LONG",
      assetClass: "FOREX", symbol: "EUR/USD",
    });
    expect(result.warnings.some(w => w.includes("capped"))).toBe(true);
  });

  it("MIN mode returns 1000 units (0.01 standard lots)", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 1.0850, stopLoss: 1.0800,
      leverage: 1, direction: "LONG",
      assetClass: "FOREX", symbol: "EUR/USD",
      mode: "MIN",
    });
    approx(result.positionSize, 1000);
    approx(result.microLots!, 1.0, 0.01);
  });
});

// --- USD/JPY ------------------------------------------------------------------
describe("USD/JPY � JPY-quoted Forex pair", () => {
  it("Balance $50k, Entry 150.00, Stop 149.00, Risk 1%, 10x leverage", () => {
    // risk = $500
    // JPY: position = (500 � 150) / 1.0 = 75,000 units = 0.75 std lots
    // pip_value = (75000 � 0.01) / 150 = $5/pip
    // margin = (75000 � 150) / 10 = $1,125,000 / 10 = $112,500 > $50k ? capped
    const result = calculate({
      balance: 50000, riskPercent: 1,
      entryPrice: 150.00, stopLoss: 149.00,
      leverage: 10, direction: "LONG",
      assetClass: "FOREX", symbol: "USD/JPY",
    });
    // Will be capped due to margin > balance
    expect(result.marginRequired).toBeLessThanOrEqual(50001);
    expect(result.standardLots).not.toBeNull();
  });

  it("correct USD/JPY pip value calculation", () => {
    const result = calculate({
      balance: 100000, riskPercent: 1,
      entryPrice: 150.00, stopLoss: 149.00,
      leverage: 10, direction: "LONG",
      assetClass: "FOREX", symbol: "USD/JPY",
    });
    // pipValue = (position � 0.01) / entry
    const expectedPipValue = (result.positionSize * 0.01) / 150;
    approx(result.pipValue, expectedPipValue, 0.5);
  });

  it("never produces NaN for JPY pair", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 150.00, stopLoss: 149.00,
      leverage: 1, direction: "LONG",
      assetClass: "FOREX", symbol: "USD/JPY",
    });
    expect(isNaN(result.positionSize)).toBe(false);
    expect(isNaN(result.marginRequired)).toBe(false);
    expect(isNaN(result.pipValue)).toBe(false);
  });
});

// --- XAU/USD (Gold) -----------------------------------------------------------
describe("XAU/USD � Gold (Spot Commodity)", () => {
  it("Balance $5k, Entry $2300, Stop $2290, Risk 1.5%, 5x leverage", () => {
    // risk = $75, stop = $10, position = 7.5 oz
    // margin = (7.5 � 2300) / 5 = $3450 = $5000 ? (with leverage!)
    const result = calculate({
      balance: 5000, riskPercent: 1.5,
      entryPrice: 2300, stopLoss: 2290,
      leverage: 5, direction: "LONG",
      assetClass: "COMMODITY", symbol: "XAU/USD",
    });
    approx(result.positionSize, 7.5, 1);
    approx(result.dollarRisk, 75, 5);
    expect(result.standardLots).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });

  it("Balance $5k, Entry $2300, Stop $2290, Risk 1.5%, no leverage ? margin capped", () => {
    // margin without leverage = 7.5 � 2300 = $17,250 > $5000 ? capped
    const result = calculate({
      balance: 5000, riskPercent: 1.5,
      entryPrice: 2300, stopLoss: 2290,
      leverage: 1, direction: "LONG",
      assetClass: "COMMODITY", symbol: "XAU/USD",
    });
    expect(result.marginRequired).toBeLessThanOrEqual(5001);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("MIN mode returns 0.01 oz", () => {
    const result = calculate({
      balance: 5000, riskPercent: 1,
      entryPrice: 2300, stopLoss: 2290,
      leverage: 1, direction: "LONG",
      assetClass: "COMMODITY", symbol: "XAU/USD",
      mode: "MIN",
    });
    approx(result.positionSize, 0.01);
  });
});

// --- Input Validation ---------------------------------------------------------
describe("Input Validation � validateInputs()", () => {
  it("returns no errors for valid LONG BTC input", () => {
    const errors = validateInputs({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors).toHaveLength(0);
  });

  it("catches stop loss above entry for LONG", () => {
    const errors = validateInputs({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 63000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors.some(e => e.field === "stopLoss")).toBe(true);
  });

  it("catches stop loss below entry for SHORT", () => {
    const errors = validateInputs({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "SHORT",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors.some(e => e.field === "stopLoss")).toBe(true);
  });

  it("catches riskPercent < 0.1", () => {
    const errors = validateInputs({
      balance: 10000, riskPercent: 0.05,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors.some(e => e.field === "riskPercent")).toBe(true);
  });

  it("catches riskPercent > 100", () => {
    const errors = validateInputs({
      balance: 10000, riskPercent: 150,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors.some(e => e.field === "riskPercent")).toBe(true);
  });

  it("catches missing risk params", () => {
    const errors = validateInputs({
      balance: 10000,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    } as any);
    expect(errors.some(e => e.field === "riskPercent")).toBe(true);
  });

  it("catches negative account balance", () => {
    const errors = validateInputs({
      balance: -1000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(errors.some(e => e.field === "balance")).toBe(true);
  });
});

// --- NaN / Infinity / Edge Cases ----------------------------------------------
describe("Edge cases � NaN, Infinity, leverage=0", () => {
  it("never produces NaN in results", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(isNaN(result.positionSize)).toBe(false);
    expect(isNaN(result.dollarRisk)).toBe(false);
    expect(isNaN(result.marginRequired)).toBe(false);
    expect(isNaN(result.pipValue)).toBe(false);
  });

  it("leverage=0 treated as leverage=1", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 62000, stopLoss: 61000,
      leverage: 0,
      direction: "LONG", assetClass: "CRYPTO", symbol: "BTC/USD",
    });
    expect(isFinite(result.marginRequired)).toBe(true);
    expect(result.positionSize).toBeGreaterThan(0);
  });

  it("unknown symbol falls back to crypto defaults", () => {
    const result = calculate({
      balance: 10000, riskPercent: 1,
      entryPrice: 100, stopLoss: 99,
      leverage: 1, direction: "LONG",
      assetClass: "CRYPTO", symbol: "DOGE/USD",
    });
    expect(isFinite(result.positionSize)).toBe(true);
    expect(result.positionSize).toBeGreaterThan(0);
  });
});
