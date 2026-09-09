/**
 * Tests for the centralized trade-logic engine.
 *
 * Includes regression coverage for the reported production bug:
 * a SHORT setup with Stop Loss BELOW Invalidation — which the old
 * flow could surface, and the new flow must repair or reject.
 */
import { describe, expect, it } from "vitest";
import { checkInvariants } from "../invariants";
import { repairSetup } from "../repair";
import { parseBias, synthSetup } from "../setup-synthesis";
import { validateSetup } from "../index";

const baseTech = {
  symbol: "BTC/USD",
  timeframe: "4h",
  currentPrice: 65000,
  support: 63000,
  resistance: 68000,
  invalidationLevel: 63000,
  rsi: 55,
  macdValue: 40,
  macdSignal: 30,
  macdHistogram: 10,
  trend: "BULLISH",
  bias: "BUY/LONG",
  atr: 900,
  volatility: 1.2,
};

const opts = { minRR: 1.5, minStopPercent: 0.001 };

describe("checkInvariants", () => {
  it("accepts a valid LONG setup", () => {
    // Convention: invalidation = structural level (support); stop at/beyond it.
    const issues = checkInvariants(
      { direction: "LONG", entry: 65000, stopLoss: 62800, invalidation: 63000, target: 68500, support: 63000, resistance: 68000, currentPrice: 65000 },
      opts
    );
    expect(issues).toHaveLength(0);
  });

  it("accepts a valid SHORT setup", () => {
    // risk 3000 (stop 68000), reward 5000 (target 60000) → R:R 1.67.
    const issues = checkInvariants(
      {
        direction: "SHORT",
        entry: 65000,
        stopLoss: 68000, // at/beyond resistance
        invalidation: 68000, // structural level
        target: 60000,
        support: 63000,
        resistance: 68000,
        currentPrice: 65000,
      },
      opts
    );
    expect(issues).toHaveLength(0);
  });

  it("REGRESSION: rejects the reported SHORT bug — stop below invalidation", () => {
    // Exact production values from the user report: SHORT with
    // Stop Loss 65341.07 BELOW Invalidation 65484.93.
    const issues = checkInvariants(
      {
        direction: "SHORT",
        entry: 65000,
        stopLoss: 65341.07,
        invalidation: 65484.93,
        target: 62000,
        support: 63000,
        resistance: 68000,
        currentPrice: 65000,
      },
      opts
    );
    expect(issues.some((i) => i.includes("SHORT") && i.includes("below Invalidation"))).toBe(true);
  });

  it("rejects a SHORT with stop below entry", () => {
    const issues = checkInvariants(
      { direction: "SHORT", entry: 65000, stopLoss: 63000, invalidation: 63500, target: 62000, currentPrice: 65000 },
      opts
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects non-positive and NaN prices", () => {
    const issues = checkInvariants({ direction: "LONG", entry: NaN, stopLoss: -1, invalidation: 0, target: Infinity }, opts);
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it("flags sub-minimum R:R", () => {
    const issues = checkInvariants(
      { direction: "LONG", entry: 65000, stopLoss: 64900, invalidation: 64800, target: 65100, currentPrice: 65000 },
      opts
    );
    expect(issues.some((i) => i.includes("Risk:Reward"))).toBe(true);
  });
});

describe("parseBias", () => {
  it("maps BUY/LONG/BULLISH and SELL/SHORT/BEARISH", () => {
    expect(parseBias({ bias: "SELL/SHORT" }, baseTech)).toBe("SHORT");
    expect(parseBias({ bias: "BUY/LONG" }, baseTech)).toBe("LONG");
    expect(parseBias({ bias: "BULLISH" }, baseTech)).toBe("LONG");
    expect(parseBias({ bias: "NEUTRAL" }, baseTech)).toBeNull();
  });
});

describe("synthSetup", () => {
  it("returns null for a NEUTRAL bias — no silently-invented direction", () => {
    const s = synthSetup({ bias: "NEUTRAL" }, { ...baseTech, bias: "NEUTRAL" });
    expect(s).toBeNull();
  });

  it("constructs a consistent LONG from structure alone (no AI numbers)", () => {
    const s = synthSetup({}, { ...baseTech, bias: "BUY/LONG" });
    expect(s).not.toBeNull();
    const issues = checkInvariants(s!, opts);
    expect(issues).toHaveLength(0);
    expect(s!.direction).toBe("LONG");
    expect(s!.riskReward).toBeGreaterThanOrEqual(1.5);
    expect(s!.provenance.entry).toBe("structure");
  });

  it("constructs a consistent SHORT from structure alone", () => {
    const s = synthSetup({ bias: "SELL/SHORT" }, { ...baseTech, bias: "SELL/SHORT", trend: "BEARISH" });
    expect(s).not.toBeNull();
    const issues = checkInvariants(s!, opts);
    expect(issues).toHaveLength(0);
    expect(s!.direction).toBe("SHORT");
    expect(s!.stopLoss).toBeGreaterThan(s!.entry);
    expect(s!.target).toBeLessThan(s!.entry);
    expect(s!.riskReward).toBeGreaterThanOrEqual(1.5);
  });

  it("accepts plausible AI numbers and keeps their provenance", () => {
    const s = synthSetup(
      { bias: "BUY/LONG", entryIdeas: "Limit near $64,800", stopLossIdea: "$62,900", takeProfitIdea: "$68,900" },
      baseTech
    );
    expect(s).not.toBeNull();
    expect(s!.entry).toBeCloseTo(64800, 0);
    expect(s!.stopLoss).toBeCloseTo(62900, 0);
    expect(s!.target).toBeCloseTo(68900, 0);
    expect(s!.provenance.entry).toBe("ai");
    expect(s!.provenance.stopLoss).toBe("ai");
    expect(s!.provenance.target).toBe("ai");
    // Invalidation is always the structural level.
    expect(s!.invalidation).toBeCloseTo(63000, 0);
  });

  it("ignores contradictory AI numbers and falls back to structure", () => {
    // SHORT where the AI puts the stop on the wrong side — the exact bug class.
    const s = synthSetup(
      { bias: "SELL/SHORT", entryIdeas: "$65,000", stopLossIdea: "$63,000", takeProfitIdea: "$70,000" },
      { ...baseTech, bias: "SELL/SHORT", trend: "BEARISH" }
    );
    expect(s).not.toBeNull();
    expect(s!.direction).toBe("SHORT");
    expect(s!.provenance.stopLoss).toBe("structure");
    expect(s!.provenance.target).toBe("structure");
    const issues = checkInvariants(s!, opts);
    expect(issues).toHaveLength(0);
  });

  it("extends a below-floor R:R via structure target", () => {
    const s = synthSetup({ bias: "BUY/LONG", entryIdeas: "$65,000", stopLossIdea: "$64,900" }, baseTech);
    expect(s).not.toBeNull();
    expect(s!.riskReward).toBeGreaterThanOrEqual(1.5);
    expect(s!.provenance.target).toBe("structure");
  });
});

describe("repairSetup", () => {
  it("repairs the reported production SHORT bug deterministically", () => {
    const broken: import("../setup-synthesis").SynthSetup = {
      direction: "SHORT",
      entry: 65200,
      stopLoss: 65341.07, // below invalidation — the bug
      invalidation: 65484.93,
      target: 62000,
      riskReward: 1.4,
      support: 63000,
      resistance: 68000,
      currentPrice: 65000,
      provenance: { entry: "ai", stopLoss: "ai", invalidation: "ai", target: "ai" },
    };
    const pre = checkInvariants(broken, opts);
    expect(pre.length).toBeGreaterThan(0);

    const repaired = repairSetup(broken, baseTech, pre);
    expect(repaired).not.toBeNull();
    const post = checkInvariants(repaired!.setup, opts);
    expect(post).toHaveLength(0);
    expect(repaired!.setup.stopLoss).toBeGreaterThanOrEqual(repaired!.setup.invalidation);
    expect(repaired!.repairs.length).toBeGreaterThan(0);
  });

  it("returns null when the current price is unusable", () => {
    const r = repairSetup(
      {
        direction: "LONG",
        entry: 1,
        stopLoss: 1,
        invalidation: 1,
        target: 1,
        riskReward: 1,
        support: 1,
        resistance: 2,
        currentPrice: NaN,
        provenance: { entry: "structure", stopLoss: "structure", invalidation: "structure", target: "structure" },
      },
      { currentPrice: NaN },
      ["bad"]
    );
    expect(r).toBeNull();
  });
});

describe("validateSetup (end-to-end)", () => {
  it("passes a coherent AI analysis through untouched", () => {
    const res = validateSetup(
      { bias: "BUY/LONG", entryIdeas: "Limit near $64,800", stopLossIdea: "$63,100", takeProfitIdea: "$68,900", support: "63,000", resistance: "68,000" },
      baseTech
    );
    expect(res.isValid).toBe(true);
    expect(res.issues).toHaveLength(0);
    expect(res.setup).not.toBeNull();
    expect(res.setup!.entry).toBeCloseTo(64800, 0);
  });

  it("neutralizes contradictory AI plans via structure (the SHORT-bug class)", () => {
    const res = validateSetup(
      { bias: "SELL/SHORT", entryIdeas: "$65,000", stopLossIdea: "$63,500", takeProfitIdea: "$71,000" }, // wrong-side stop AND target
      { ...baseTech, bias: "SELL/SHORT", trend: "BEARISH" }
    );
    // Synthesis refuses structurally-invalid AI numbers at construction
    // time, so the plan is consistent BY CONSTRUCTION — no repair needed.
    expect(res.isValid).toBe(true);
    expect(res.setup!.direction).toBe("SHORT");
    expect(res.setup!.stopLoss).toBeGreaterThan(res.setup!.entry);
    expect(res.setup!.invalidation).toBeLessThanOrEqual(res.setup!.stopLoss);
    expect(res.setup!.target).toBeLessThan(res.setup!.entry);
    expect(res.setup!.riskReward).toBeGreaterThanOrEqual(1.5);
    // The AI's bad numbers were replaced by deterministic ones.
    expect(res.setup!.provenance.stopLoss).toBe("structure");
    expect(res.setup!.provenance.target).toBe("structure");
  });

  it("still flags narrative contradictions via the legacy validator", () => {
    const res = validateSetup(
      {
        bias: "BUY/LONG",
        coachNarrative: "The MACD is bearish and RSI is oversold, showing weakening momentum.", // contradicts bullish MACD telemetry
        entryIdeas: "Limit near $64,800",
        stopLossIdea: "$63,100",
        takeProfitIdea: "$68,900",
      },
      baseTech
    );
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.startsWith("MACD") || i.startsWith("RSI"))).toBe(true);
  });
});