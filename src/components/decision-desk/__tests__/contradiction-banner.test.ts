import { describe, it, expect } from "vitest";
import { findContradictions } from "@/components/decision-desk/ContradictionBanner";

describe("findContradictions", () => {
  it("detects bullish structure + overbought momentum", () => {
    const forItems = ["Regime: Trending Up", "EMA crossover bullish"];
    const againstItems = ["RSI(14) 72.5 (overbought)"];
    const result = findContradictions(forItems, againstItems);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].summary.toLowerCase()).toContain("bullish structure");
  });

  it("detects mixed MTF alignment", () => {
    const forItems = ["Multi-timeframe: mixed across 1h up, 4h down"];
    const againstItems = ["Higher timeframes disagree with the selected timeframe"];
    const result = findContradictions(forItems, againstItems);
    expect(result.some((r) => r.summary.toLowerCase().includes("multi-timeframe"))).toBe(true);
  });

  it("returns empty when no conflicts", () => {
    const forItems = ["Regime: Trending Up", "Volume surge 2.1x average"];
    const againstItems = ["Price approaching resistance"];
    const result = findContradictions(forItems, againstItems);
    // Approaching resistance is a risk, not necessarily a conflict in our rules
    expect(result.length).toBe(0);
  });
});
