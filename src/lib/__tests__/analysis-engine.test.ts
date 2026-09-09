import { describe, expect, it } from "vitest";
import {
  buildMarketStateLayer,
  computeStateChanges,
  buildAlternativeHypotheses,
  detectContradictions,
  deriveInvalidation,
  buildMarketAnalysis,
} from "../analysis-engine";
import type { OHLCVCandle } from "../types";

function makeTrendCandles(n: number, start: number, drift: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const open = price;
    const swing = Math.sin(i / 5) * start * 0.02;
    price = price * (1 + drift) + swing * 0.15;
    candles.push({
      timestamp: 1700000000000 + i * 3600_000,
      open,
      high: Math.max(open, price) * 1.002,
      low: Math.min(open, price) * 0.998,
      close: price,
      volume: 100 + i,
    });
  }
  return candles;
}

function makeRangeCandles(n: number, mid: number, band: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  for (let i = 0; i < n; i++) {
    const wave = Math.sin(i / 3) * band;
    const open = mid + wave;
    const close = mid + Math.sin((i + 1) / 3) * band;
    candles.push({
      timestamp: 1700000000000 + i * 3600_000,
      open,
      high: Math.max(open, close) * 1.001,
      low: Math.min(open, close) * 0.999,
      close,
      volume: 100,
    });
  }
  return candles;
}

describe("analysis-engine", () => {
  it("builds a market state layer with all sub-states", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    // Rewrite timestamps to be recent so freshness reads FRESH deterministically.
    const now = Date.now();
    const recentCandles = candles.map((c, i) => ({ ...c, timestamp: now - (candles.length - 1 - i) * 3600_000 }));
    const { layer, freshness } = buildMarketStateLayer("BTC/USD", "4h", recentCandles, { price: recentCandles[recentCandles.length - 1].close, change24h: 1200, changePercent24h: 2 });
    expect(layer).toBeTruthy();
    expect(freshness).toBe("FRESH");
    expect(layer.trend.direction).toBe("UP");
    expect(layer.momentum.rsi).toBeGreaterThan(0);
    expect(layer.volatility.state).toBeDefined();
    expect(layer.structure.support).toBeGreaterThan(0);
    expect(layer.phase).toBe("TRENDING");
    expect(layer.acceleration.price).toBeDefined();
  });

  it("classifies a ranging market correctly", () => {
    const candles = makeRangeCandles(100, 65000, 900);
    const { layer } = buildMarketStateLayer("BTC/USD", "4h", candles);
    expect(["RANGING", "ACCUMULATION"]).toContain(layer.phase);
    expect(layer.regime.regime).toBe("RANGING");
  });

  it("detects contradictions between trend and momentum", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { layer } = buildMarketStateLayer("BTC/USD", "4h", candles);
    // Force exhausted RSI state for contradiction detection
    layer.momentum.state = "EXHAUSTED";
    layer.momentum.rsi = 72;
    const mtf = null as any;
    const contradictions = detectContradictions(layer, mtf);
    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].type).toContain("Trend vs Momentum");
  });

  it("builds alternative hypotheses with statuses", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { layer } = buildMarketStateLayer("BTC/USD", "4h", candles);
    const hypotheses = buildAlternativeHypotheses(layer);
    expect(hypotheses.length).toBeGreaterThanOrEqual(4);
    expect(hypotheses.every((h) => ["SUPPORTED", "PLAUSIBLE", "WEAK", "INSUFFICIENT_DATA"].includes(h.status))).toBe(true);
    expect(hypotheses[0].invalidationCondition).toBeTruthy();
  });

  it("derives deterministic invalidation for long and short", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { layer } = buildMarketStateLayer("BTC/USD", "4h", candles);
    const longInv = deriveInvalidation(layer, "LONG");
    expect(longInv).toBeTruthy();
    expect(longInv!.level).toBeLessThan(layer.price.value);
    const shortInv = deriveInvalidation(layer, "SHORT");
    expect(shortInv).toBeTruthy();
    expect(shortInv!.level).toBeGreaterThan(layer.price.value);
  });

  it("computes honest state changes with significance", () => {
    const candles1 = makeTrendCandles(100, 60000, 0.003);
    const candles2 = makeTrendCandles(100, 65000, 0.003);
    const { layer: then } = buildMarketStateLayer("BTC/USD", "4h", candles1, { price: 60000, change24h: 0, changePercent24h: 0 });
    const { layer: now } = buildMarketStateLayer("BTC/USD", "4h", candles2, { price: 65000, change24h: 5000, changePercent24h: 8 });
    const changes = computeStateChanges(then, now);
    const priceChange = changes.find((c) => c.variable === "Price");
    expect(priceChange).toBeTruthy();
    expect(priceChange!.significance).toBe("MAJOR");
    expect(priceChange!.percentChange).toBeGreaterThan(0);
  });

  it("does not label identical values as changes", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const t0 = Date.now();
    const recentCandles = candles.map((c, i) => ({ ...c, timestamp: t0 - (candles.length - 1 - i) * 3600_000 }));
    const { layer: then } = buildMarketStateLayer("BTC/USD", "4h", recentCandles);
    const { layer: nowLayer } = buildMarketStateLayer("BTC/USD", "4h", recentCandles);
    const changes = computeStateChanges(then, nowLayer, { price: then.price.value }, { price: nowLayer.price.value });
    const priceChange = changes.find((c) => c.variable === "Price");
    expect(priceChange?.significance ?? "NONE").not.toBe("MAJOR");
  });

  it("builds a full analysis result with evidence and hypotheses", async () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const t0 = Date.now();
    const recentCandles = candles.map((c, i) => ({ ...c, timestamp: t0 - (candles.length - 1 - i) * 3600_000 }));
    const result = await buildMarketAnalysis({
      symbol: "BTC/USD",
      timeframe: "4h",
      candles: recentCandles,
      priceData: { price: recentCandles[recentCandles.length - 1].close, change24h: 1200, changePercent24h: 2 },
      direction: "LONG",
    });
    expect(result.marketState).toBeTruthy();
    expect(result.evidenceFor.length).toBeGreaterThan(0);
    expect(result.hypotheses.length).toBeGreaterThanOrEqual(4);
    expect(result.metadata.candleCount).toBe(100);
    expect(result.invalidation).toBeTruthy();
  });

  it("returns UNAVAILABLE when candle history is insufficient", async () => {
    const result = await buildMarketAnalysis({
      symbol: "BTC/USD",
      timeframe: "4h",
      candles: [],
      direction: "LONG",
    });
    expect(result.freshness).toBe("UNAVAILABLE");
    expect(result.marketState).toBeNull();
  });

  it("does not fabricate prices when market data is missing", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { layer } = buildMarketStateLayer("BTC/USD", "4h", candles);
    expect(layer.price.value).toBe(candles[candles.length - 1].close);
  });
});
