/**
 * src/lib/market-context.ts
 *
 * MARKET CONTEXT ENGINE (V2).
 *
 * Turns raw OHLCV into structured, deterministic market context:
 *   - Market regime classification (trending/ranging/volatile/breakout...)
 *   - Multi-timeframe alignment (the selected TF vs higher-TF trend)
 *   - Structural events summary feeding the AI reasoning layer
 *
 * Everything here is pure, deterministic math on candles — no AI, no
 * fabrication. The AI layer reasons FROM this context; it never
 * generates it.
 */

import { calculateEMA, calculateRSI } from "./indicators";
import type { OHLCVCandle } from "./types";

export type MarketRegime =
  | "TRENDING_UP"
  | "TRENDING_DOWN"
  | "RANGING"
  | "HIGH_VOLATILITY"
  | "LOW_VOLATILITY"
  | "BREAKOUT"
  | "BREAKDOWN"
  | "TRANSITIONAL";

export interface RegimeAssessment {
  regime: MarketRegime;
  label: string;
  /** Deterministic drivers behind the classification — shown to the user. */
  reasons: string[];
}

export interface TFView {
  timeframe: string;
  trend: "UP" | "DOWN" | "FLAT";
  ema20: number;
  ema50: number;
  rsi: number;
  /** EMA20 vs EMA50 separation as % of price — trend strength proxy. */
  emaSeparationPct: number;
}

export interface MTFAlignment {
  alignment: "ALIGNED_BULLISH" | "ALIGNED_BEARISH" | "MIXED" | "NEUTRAL";
  score: number; // -1 .. +1
  views: TFView[];
}

export interface MarketContext {
  symbol: string;
  timeframe: string;
  regime: RegimeAssessment;
  mtf: MTFAlignment | null;
  /** Confidence inputs — consumed by the confidence engine. */
  confidenceInputs: {
    trendClarity: number; // 0..1 — EMA separation + slope consistency
    momentumAlignment: number; // 0..1 — RSI/MACD agreement with trend
    volatilityFit: number; // 0..1 — ATR within a sane band (not dead, not spiking)
    structureQuality: number; // 0..1 — support/resistance distance sanity
    dataQuality: number; // 0..1 — candle count + freshness
    mtfAlignment: number; // 0..1 — higher-TF agreement
  };
}

// ------------------------------------------------------------ helpers

function tfToMinutes(tf: string): number {
  switch (tf) {
    case "1m": return 1;
    case "5m": return 5;
    case "15m": return 15;
    case "1h": return 60;
    case "4h": return 240;
    case "1d": return 1440;
    case "1W": return 10080;
    default: return 60;
  }
}

/** The next timeframe(s) up from the selected one, for MTF context. */
function higherTimeframes(tf: string): string[] {
  const order = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"];
  const idx = order.indexOf(tf);
  if (idx < 0 || idx >= order.length - 1) return [];
  // Two steps up is enough context without exploding fetch cost.
  return order.slice(idx + 1, Math.min(idx + 3, order.length)).slice(0, 2);
}

function computeTFView(tf: string, candles: OHLCVCandle[]): TFView | null {
  if (!candles || candles.length < 52) return null;
  const closes = candles.map((c) => c.close);
  // Indicator functions return full per-bar series; take the latest value.
  const ema20Series = calculateEMA(closes, 20);
  const ema50Series = calculateEMA(closes, 50);
  const rsiSeries = calculateRSI(closes, 14);
  const ema20 = Array.isArray(ema20Series) ? ema20Series[ema20Series.length - 1] : ema20Series;
  const ema50 = Array.isArray(ema50Series) ? ema50Series[ema50Series.length - 1] : ema50Series;
  const rsi = Array.isArray(rsiSeries) ? rsiSeries[rsiSeries.length - 1] : rsiSeries;
  if (!Number.isFinite(ema20) || !Number.isFinite(ema50) || !Number.isFinite(rsi)) return null;
  const price = closes[closes.length - 1];
  const emaSeparationPct = price > 0 ? ((ema20 - ema50) / price) * 100 : 0;

  let trend: TFView["trend"] = "FLAT";
  if (ema20 > ema50 * 1.001 && price > ema20 * 0.999) trend = "UP";
  else if (ema20 < ema50 * 0.999 && price < ema20 * 1.001) trend = "DOWN";

  return {
    timeframe: tf,
    trend,
    ema20,
    ema50,
    rsi,
    emaSeparationPct,
  };
}

// ------------------------------------------------------------ regime

export function assessRegime(
  candles: OHLCVCandle[],
  ctx: {
    trend: string;
    volatilityPct: number; // annualized-ish % from calculateVolatility
    isVolatilitySpike: boolean;
    support: number;
    resistance: number;
    currentPrice: number;
  }
): RegimeAssessment {
  const reasons: string[] = [];
  const price = ctx.currentPrice;
  const range = Math.max(ctx.resistance - ctx.support, 1e-9);
  const positionInRange = (price - ctx.support) / range; // 0 at support, 1 at resistance

  // Breakout / breakdown: recent close beyond the 50-candle structure.
  const closes = candles.map((c) => c.close);
  const last3 = closes.slice(-3);
  const brokeAbove = last3.every((c) => c > ctx.resistance);
  const brokeBelow = last3.every((c) => c < ctx.support);

  // Range tightness: 50-candle range vs recent volatility.
  const rangePct = price > 0 ? range / price : 0;

  const isTrendUp = ctx.trend.includes("BULLISH");
  const isTrendDown = ctx.trend.includes("BEARISH");

  // Volatility spikes take priority over breakout claims: a spike-driven
  // pop above resistance is stop-hunting noise, not a trustworthy breakout.
  const volPct = Number.isFinite(ctx.volatilityPct) ? (ctx.volatilityPct as number) : 0;
  if (ctx.isVolatilitySpike || volPct > 4) {
    reasons.push(`Volatility spike active (σ ${volPct.toFixed(2)}% over 20 bars).`);
    return { regime: "HIGH_VOLATILITY", label: "High Volatility", reasons };
  }

  if (brokeAbove) {
    reasons.push(`Price closed above resistance ($${ctx.resistance.toLocaleString()}) for 3 consecutive candles — breakout confirmation.`);
    return { regime: "BREAKOUT", label: "Breakout", reasons };
  }
  if (brokeBelow) {
    reasons.push(`Price closed below support ($${ctx.support.toLocaleString()}) for 3 consecutive candles — breakdown confirmation.`);
    return { regime: "BREAKDOWN", label: "Breakdown", reasons };
  }

  if (volPct < 0.4 && rangePct < 0.02) {
    reasons.push(`Volatility compressed (σ ${volPct.toFixed(2)}%) inside a ${((rangePct) * 100).toFixed(2)}% range — coiling.`);
    return { regime: "LOW_VOLATILITY", label: "Low Volatility / Compression", reasons };
  }

  if (isTrendUp && rangePct > 0.03) {
    reasons.push(`Uptrend: price above rising EMAs, riding a ${(rangePct * 100).toFixed(1)}% structural range.`);
    if (positionInRange > 0.85) reasons.push(`Price is ${(positionInRange * 100).toFixed(0)}% up the range — extended from support.`);
    return { regime: "TRENDING_UP", label: "Trending Up", reasons };
  }
  if (isTrendDown && rangePct > 0.03) {
    reasons.push(`Downtrend: price below falling EMAs, riding a ${(rangePct * 100).toFixed(1)}% structural range.`);
    if (positionInRange < 0.15) reasons.push(`Price is only ${(positionInRange * 100).toFixed(0)}% above support — extended from resistance.`);
    return { regime: "TRENDING_DOWN", label: "Trending Down", reasons };
  }

  if (rangePct <= 0.03) {
    reasons.push(`Price is range-bound between $${ctx.support.toLocaleString()} and $${ctx.resistance.toLocaleString()} (${(rangePct * 100).toFixed(1)}% band).`);
    return { regime: "RANGING", label: "Ranging", reasons };
  }

  reasons.push("Structure is ambiguous — trend signals conflict with range compression. Treat as transitional.");
  return { regime: "TRANSITIONAL", label: "Transitional", reasons };
}

// ------------------------------------------------------------ MTF

export function computeMTFAlignment(selected: TFView, higher: TFView[]): MTFAlignment {
  const views = [selected, ...higher].filter(Boolean);
  const scored: number[] = views.map((v) => (v.trend === "UP" ? 1 : v.trend === "DOWN" ? -1 : 0));
  const sum = scored.reduce((a: number, b: number) => a + b, 0);
  const normalized = views.length > 0 ? sum / views.length : 0;

  let alignment: MTFAlignment["alignment"] = "NEUTRAL";
  if (normalized >= 0.99) alignment = "ALIGNED_BULLISH";
  else if (normalized <= -0.99) alignment = "ALIGNED_BEARISH";
  else if (views.every((v) => v.trend === "FLAT")) alignment = "NEUTRAL";
  else alignment = "MIXED";

  return { alignment, score: normalized, views };
}

// ------------------------------------------------------------ main entry

/**
 * Build the full market context for a symbol/timeframe.
 *
 * `fetchHigherTF` is injected so this module stays pure/testable —
 * production passes getOHLCV; tests pass fixtures. Higher-TF fetch
 * failures degrade gracefully to selected-TF-only context.
 */
export async function buildMarketContext(
  symbol: string,
  timeframe: string,
  candles: OHLCVCandle[],
  telemetry: {
    trend: string;
    /** Standard-deviation % of the last 20 closes (calculateVolatility). */
    volatilityPct: number;
    isVolatilitySpike: boolean;
    support: number;
    resistance: number;
    currentPrice: number;
    rsi: number;
    macdValue: number;
    macdSignal: number;
    macdHistogram: number;
    atr: number;
  },
  fetchHigherTF?: (symbol: string, tf: string, limit: number) => Promise<OHLCVCandle[]>
): Promise<MarketContext> {
  const selectedView = computeTFView(timeframe, candles);

  let mtf: MTFAlignment | null = null;
  const higherTFs = higherTimeframes(timeframe);
  if (selectedView && fetchHigherTF && higherTFs.length > 0) {
    const higherViews: TFView[] = [];
    for (const htf of higherTFs) {
      try {
        const hCandles = await fetchHigherTF(symbol, htf, 60);
        const view = computeTFView(htf, hCandles);
        if (view) higherViews.push(view);
      } catch {
        // Degrade gracefully — MTF is context, not a hard dependency.
      }
    }
    if (higherViews.length > 0) {
      mtf = computeMTFAlignment(selectedView, higherViews);
    }
  }

  // ------------------------------------------------ confidence inputs
  const price = telemetry.currentPrice;
  const ema20 = Number.isFinite(selectedView?.ema20 ?? NaN) ? (selectedView!.ema20 as number) : price;
  const ema50 = Number.isFinite(selectedView?.ema50 ?? NaN) ? (selectedView!.ema50 as number) : price;

  // Trend clarity: EMA separation relative to ATR — separation >> noise.
  const atr = telemetry.atr > 0 ? telemetry.atr : price * 0.005;
  const emaSep = Math.abs(ema20 - ema50);
  const trendClarity = Math.max(0, Math.min(1, emaSep / (atr * 2)));

  // Momentum alignment: RSI and MACD agree with the trend direction.
  const trendUp = telemetry.trend.includes("BULLISH");
  const macdBull = telemetry.macdValue > telemetry.macdSignal;
  const rsiAligned = trendUp ? telemetry.rsi >= 50 : telemetry.rsi <= 50;
  const macdAligned = trendUp ? macdBull : !macdBull;
  const momentumAlignment = (Number(rsiAligned) + Number(macdAligned) + Number(Math.abs(telemetry.macdHistogram) > 0)) / 3;

  // Volatility fit: penalize dead (can't move) and spiked (stop-hunt) tape.
  const volPct = telemetry.volatilityPct;
  const volatilityFit =
    volPct <= 0.15 ? volPct / 0.15 * 0.4 :
    volPct >= 4 ? Math.max(0, 1 - (volPct - 4) / 4) * 0.5 :
    0.6 + 0.4 * Math.min(1, (volPct - 0.15) / 1.0);

  // Structure quality: distance to both S and R (room to move).
  const distToSupport = Math.abs(price - telemetry.support) / price;
  const distToResistance = Math.abs(telemetry.resistance - price) / price;
  const structureQuality =
    Math.max(0, Math.min(1, distToSupport / 0.02)) * 0.5 +
    Math.max(0, Math.min(1, distToResistance / 0.02)) * 0.5;

  // Data quality: candles available (indicators need >= 50) — freshness
  // is enforced upstream by validate-market-data.
  const dataQuality = Math.max(0, Math.min(1, (candles.length - 20) / 80));

  // MTF alignment: 1 when higher TFs agree with selection, 0 when they
  // conflict, 0.5 when unavailable.
  const mtfAlignment = mtf ? Math.max(0, (mtf.score + 1) / 2) : 0.5;

  const regime = assessRegime(candles, {
    trend: telemetry.trend,
    volatilityPct: telemetry.volatilityPct,
    isVolatilitySpike: telemetry.isVolatilitySpike,
    support: telemetry.support,
    resistance: telemetry.resistance,
    currentPrice: telemetry.currentPrice,
  });

  return {
    symbol,
    timeframe,
    regime,
    mtf,
    confidenceInputs: {
      trendClarity,
      momentumAlignment,
      volatilityFit,
      structureQuality,
      dataQuality,
      mtfAlignment,
    },
  };
}

export { tfToMinutes };
export type { OHLCVCandle };