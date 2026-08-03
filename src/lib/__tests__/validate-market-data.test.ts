import { describe, it, expect } from "vitest";
import { isSimulatedCandles, isDataFresh } from "@/lib/validate-market-data";

describe("isSimulatedCandles", () => {
  it("returns false for an all-LIVE candle set", () => {
    const candles = [
      { source: "LIVE", close: 100 },
      { source: "LIVE", close: 101 },
      { source: "LIVE", close: 102 },
    ];
    expect(isSimulatedCandles(candles)).toBe(false);
  });

  it("returns true when the most recent candle is SIMULATED", () => {
    // The last candle is authoritative for the current bar's provenance.
    const candles = [
      { source: "LIVE", close: 100 },
      { source: "LIVE", close: 101 },
      { source: "SIMULATED", close: 102 },
    ];
    expect(isSimulatedCandles(candles)).toBe(true);
  });

  it("returns true when any candle in the set is SIMULATED", () => {
    const candles = [
      { source: "SIMULATED", close: 100 },
      { source: "LIVE", close: 101 },
      { source: "LIVE", close: 102 },
    ];
    expect(isSimulatedCandles(candles)).toBe(true);
  });

  it("returns false for an empty array (no data to classify)", () => {
    expect(isSimulatedCandles([])).toBe(false);
  });

  it("returns false when candles carry no source field (unknown provenance is not simulated)", () => {
    // Candles without a source tag should not be mislabeled as simulated —
    // only an explicit "SIMULATED" tag indicates the fallback was used.
    const candles = [{ close: 100 }, { close: 101 }];
    expect(isSimulatedCandles(candles)).toBe(false);
  });

  it("does not throw on non-array input", () => {
    expect(isSimulatedCandles(null as any)).toBe(false);
    expect(isSimulatedCandles(undefined as any)).toBe(false);
  });
});

describe("isDataFresh (regression guard)", () => {
  it("treats a recent candle timestamp as fresh", () => {
    expect(isDataFresh(Date.now() - 30_000, "1h")).toBe(true);
  });

  it("rejects a timestamp far older than the candle duration + grace", () => {
    // 1h candle: duration 3600s + grace 180s. 2h old is stale.
    expect(isDataFresh(Date.now() - 2 * 60 * 60 * 1000, "1h")).toBe(false);
  });
});