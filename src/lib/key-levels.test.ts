import { describe, expect, it } from "vitest";
import type { OHLCVCandle } from "@/lib/types";
import { calculateKeyLevels } from "./indicators";
import { validateLevels } from "./validate-market-data";

const candle = (i: number, close: number): OHLCVCandle => ({
  timestamp: i * 3_600_000,
  open: close,
  high: close * 1.004,
  low: close * 0.996,
  close,
  volume: 1,
});

const series = (closes: number[]) => closes.map((c, i) => candle(i, c));

describe("calculateKeyLevels", () => {
  it("keeps the recent range when price is inside it", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    closes.push(100);
    const levels = calculateKeyLevels(series(closes));
    expect(levels.support).toBeLessThan(100);
    expect(levels.resistance).toBeGreaterThan(100);
    expect(validateLevels(levels, 100)).toEqual([]);
  });

  it("projects support below price when price is at a fresh low (sell-off)", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 120 - i * 0.4); // steadily falling to a new low
    const price = closes[closes.length - 1];
    const levels = calculateKeyLevels(series(closes));
    expect(levels.support).toBeLessThan(price);
    expect(levels.resistance).toBeGreaterThan(price);
    expect(validateLevels(levels, price)).toEqual([]);
  });

  it("projects resistance above price when price is at a fresh high (breakout)", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 80 + i * 0.4);
    const price = closes[closes.length - 1];
    const levels = calculateKeyLevels(series(closes));
    expect(levels.resistance).toBeGreaterThan(price);
    expect(levels.support).toBeLessThan(price);
    expect(validateLevels(levels, price)).toEqual([]);
  });

  it("never returns a non-positive support", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 10 - i * 0.16);
    const levels = calculateKeyLevels(series(closes));
    expect(levels.support).toBeGreaterThan(0);
  });
});
