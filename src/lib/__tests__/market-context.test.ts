import { describe, expect, it } from "vitest";
import { assessRegime, computeMTFAlignment, buildMarketContext } from "../market-context";
import { computeConfidence } from "../confidence-engine";
import type { OHLCVCandle } from "../types";

// Deterministic candle factory: a rising trend with deep-enough
// pullback swings that the last-50-bar range is meaningful (>3%),
// the realistic shape of a TRENDING_UP market (trends contain
// retracements — a monotonic drift is a BREAKOUT, correctly).
function makeTrendCandles(n: number, start: number, drift: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const open = price;
    // Sustained drift + a swing component big enough to keep the
    // 50-bar range > 3% while direction stays up.
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

const upTelemetry = {
  trend: "BULLISH",
  volatilityPct: 1.2,
  isVolatilitySpike: false,
  support: 63000,
  resistance: 68000,
  currentPrice: 65500,
  rsi: 58,
  macdValue: 120,
  macdSignal: 90,
  macdHistogram: 30,
  atr: 700,
};

// S/R from the LAST 50 closes — mirroring the production key-level
// detector (calculateKeyLevels), so fixtures are structurally realistic.
function keyLevels(candles: OHLCVCandle[]) {
  const closes = candles.map((c) => c.close).slice(-50);
  return { support: Math.min(...closes), resistance: Math.max(...closes) };
}

describe("assessRegime", () => {
  it("classifies a clean uptrend as TRENDING_UP", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { support, resistance } = keyLevels(candles);
    const price = candles[candles.length - 1].close;
    const r = assessRegime(candles, { ...upTelemetry, support, resistance, currentPrice: price });
    expect(r.regime).toBe("TRENDING_UP");
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("classifies a bearish trend as TRENDING_DOWN", () => {
    const candles = makeTrendCandles(100, 70000, -0.003);
    const { support, resistance } = keyLevels(candles);
    const price = candles[candles.length - 1].close;
    const r = assessRegime(candles, { ...upTelemetry, trend: "BEARISH", support, resistance, currentPrice: price });
    expect(r.regime).toBe("TRENDING_DOWN");
  });

  it("classifies a wide sine-wave market as RANGING", () => {
    // Band wide enough (>2% range) with healthy volatility — a genuine
    // range, not the dead tape that reads as LOW_VOLATILITY.
    const candles = makeRangeCandles(100, 65000, 900);
    const closes = candles.map((c) => c.close);
    const support = Math.min(...closes.slice(-50));
    const resistance = Math.max(...closes.slice(-50));
    const r = assessRegime(candles, {
      ...upTelemetry,
      trend: "SIDEWAYS",
      support,
      resistance,
      currentPrice: closes[closes.length - 1],
      volatilityPct: 0.9,
    });
    expect(r.regime).toBe("RANGING");
  });

  it("flags a volatility spike as HIGH_VOLATILITY even during a breakout attempt", () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { support, resistance } = keyLevels(candles);
    const price = candles[candles.length - 1].close;
    const r = assessRegime(candles, { ...upTelemetry, isVolatilitySpike: true, support, resistance, currentPrice: price });
    expect(r.regime).toBe("HIGH_VOLATILITY");
  });

  it("detects a confirmed breakout above resistance", () => {
    const candles = makeTrendCandles(100, 66000, 0.004);
    const r = assessRegime(candles, { ...upTelemetry, support: 63000, resistance: 66000, currentPrice: 68500 });
    expect(r.regime).toBe("BREAKOUT");
  });
});

describe("computeMTFAlignment", () => {
  const view = (trend: "UP" | "DOWN" | "FLAT") =>
    ({ timeframe: "1h", trend, ema20: 1, ema50: 1, rsi: 50, emaSeparationPct: 0 }) as any;

  it("aligns bullish when every TF is up", () => {
    const mtf = computeMTFAlignment(view("UP"), [view("UP"), view("UP")]);
    expect(mtf.alignment).toBe("ALIGNED_BULLISH");
    expect(mtf.score).toBeCloseTo(1);
  });

  it("reports MIXED when higher TFs disagree", () => {
    const mtf = computeMTFAlignment(view("UP"), [view("DOWN"), view("UP")]);
    expect(mtf.alignment).toBe("MIXED");
  });
});

describe("buildMarketContext", () => {
  it("produces context and confidence inputs from real candles", async () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { support, resistance } = keyLevels(candles);
    const price = candles[candles.length - 1].close;
    const ctx = await buildMarketContext("BTC/USD", "4h", candles, {
      ...upTelemetry,
      support,
      resistance,
      currentPrice: price,
    });
    expect(ctx.regime.regime).toBe("TRENDING_UP");
    expect(ctx.mtf).toBeNull(); // no fetchHigherTF provided → degrades gracefully
    expect(ctx.confidenceInputs.trendClarity).toBeGreaterThan(0);
    expect(ctx.confidenceInputs.dataQuality).toBeGreaterThan(0.5);
  });

  it("builds MTF context when a higher-TF fetcher is provided", async () => {
    const candles = makeTrendCandles(100, 60000, 0.003);
    const { support, resistance } = keyLevels(candles);
    const price = candles[candles.length - 1].close;
    const higher = makeTrendCandles(60, 60000, 0.004);
    const ctx = await buildMarketContext("BTC/USD", "1h", candles, { ...upTelemetry, support, resistance, currentPrice: price }, async () => higher);
    expect(ctx.mtf).not.toBeNull();
    expect(["ALIGNED_BULLISH", "MIXED", "ALIGNED_BEARISH", "NEUTRAL"]).toContain(ctx.mtf!.alignment);
    expect(ctx.confidenceInputs.mtfAlignment).toBeGreaterThan(0);
  });
});

describe("computeConfidence", () => {
  const strongContext = {
    confidenceInputs: {
      trendClarity: 0.9,
      momentumAlignment: 1,
      volatilityFit: 0.9,
      structureQuality: 0.8,
      dataQuality: 1,
      mtfAlignment: 1,
    },
    regime: { regime: "TRENDING_UP", label: "Trending Up", reasons: [] },
    mtf: { alignment: "ALIGNED_BULLISH", score: 1, views: [] },
  };

  const weakContext = {
    confidenceInputs: {
      trendClarity: 0.2,
      momentumAlignment: 0.2,
      volatilityFit: 0.3,
      structureQuality: 0.2,
      dataQuality: 0.4,
      mtfAlignment: 0.2,
    },
    regime: { regime: "TRANSITIONAL", label: "Transitional", reasons: [] },
    mtf: null,
  };

  it("awards HIGH only when evidence is strong and consistent", () => {
    const r = computeConfidence({
      marketContext: strongContext as any,
      setup: { riskReward: 2.5, direction: "LONG" },
    });
    expect(r.tier).toBe("HIGH");
    expect(r.score).toBeGreaterThanOrEqual(68);
    expect(r.factors.length).toBeGreaterThan(4);
  });

  it("awards LOW when evidence is weak", () => {
    const r = computeConfidence({
      marketContext: weakContext as any,
      setup: { riskReward: 1.6, direction: "LONG" },
    });
    expect(r.tier).toBe("LOW");
    expect(r.score).toBeLessThan(45);
  });

  it("caps HIGH at MEDIUM when conflicting signals exist", () => {
    const r = computeConfidence({
      marketContext: strongContext as any,
      setup: { riskReward: 2.5, direction: "LONG" },
      conflicts: ["Bearish divergence on RSI"],
    });
    expect(r.tier).toBe("MEDIUM");
    expect(r.factors.some((f) => f.name === "Confidence cap")).toBe(true);
  });

  it("penalizes high-volatility regimes", () => {
    const volatileCtx = {
      ...strongContext,
      regime: { regime: "HIGH_VOLATILITY", label: "High Volatility", reasons: [] },
    };
    const r = computeConfidence({ marketContext: volatileCtx as any, setup: { riskReward: 2.5, direction: "LONG" } });
    expect(r.tier).toBe("MEDIUM");
    expect(r.factors.some((f) => f.note.includes("High-volatility regime"))).toBe(true);
  });

  it("exposes factors so the UI can show WHY", () => {
    const r = computeConfidence({ marketContext: strongContext as any, setup: { riskReward: 2, direction: "LONG" } });
    for (const f of r.factors) {
      expect(f.note.length).toBeGreaterThan(5);
      expect(["positive", "negative", "neutral"]).toContain(f.direction);
    }
  });
});