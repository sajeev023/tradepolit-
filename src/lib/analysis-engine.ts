/**
 * src/lib/analysis-engine.ts
 *
 * WORLD-CLASS ANALYSIS ENGINE (V5)
 *
 * Builds a multi-layer, deterministic market analysis from verified
 * market data. This is the single source of truth for:
 *   - Market state (trend, regime, volatility, momentum, structure)
 *   - Multi-timeframe structure and interaction
 *   - What changed (decision-time vs current state)
 *   - Supporting / contradicting evidence
 *   - Contradiction detection
 *   - Alternative hypotheses
 *   - Invalidation conditions
 *   - Confidence inputs
 *
 * Design rules:
 *   - Everything deterministic is computed from OHLCV + indicators.
 *   - AI adds interpretation only; it never generates state.
 *   - Missing/stale/simulated data is surfaced explicitly — never fabricated.
 *   - Every major output includes timestamp and source.
 */

import type { OHLCVCandle } from "./types";
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateVolatility,
  calculateKeyLevels,
  type TechnicalContext,
} from "./indicators";
import {
  assessRegime,
  buildMarketContext as buildLegacyMarketContext,
  type MarketContext,
  type RegimeAssessment,
  type MTFAlignment,
} from "./market-context";

export type DataFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

export interface TimestampedValue<T> {
  value: T;
  timestamp: string; // ISO
  source: string;
  freshness: DataFreshness;
}

export type MarketTrend = "UP" | "DOWN" | "FLAT";
export type MomentumState = "ACCELERATING" | "DECELERATING" | "STEADY" | "EXHAUSTED" | "NEUTRAL";
export type VolatilityState = "EXPANDING" | "CONTRACTING" | "NORMAL" | "EXTREME" | "DEAD";
export type MarketPhase = "TRENDING" | "RANGING" | "ACCUMULATION" | "DISTRIBUTION" | "BREAKOUT" | "REVERSAL" | "TRANSITIONAL";

export interface TrendState {
  direction: MarketTrend;
  strength: number; // 0..1
  ema20: number;
  ema50: number;
  ema200?: number;
  slope20: number; // normalized per-bar slope
  emaSeparationPct: number;
  durationBars: number; // bars since last direction flip
}

export interface MomentumStateDetail {
  state: MomentumState;
  rsi: number;
  rsiLabel: string;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  macdCrossover: "BULLISH" | "BEARISH" | null;
  // divergence detection vs price
  divergence: "BULLISH" | "BEARISH" | null;
  divergenceReason?: string;
}

export interface VolatilityStateDetail {
  state: VolatilityState;
  atr: number;
  atrPercent: number; // ATR as % of price
  standardDeviationPercent: number;
  isSpike: boolean;
  expansionRatio: number; // current vs average ATR
}

export interface StructureState {
  support: number;
  resistance: number;
  positionInRange: number; // 0..1
  rangePercent: number;
  nearestLevel: "SUPPORT" | "RESISTANCE" | null;
  distanceToNearestLevelPercent: number;
  brokenSupport: boolean;
  brokenResistance: boolean;
  liquiditySweep: boolean;
  fakeBreakout: boolean;
}

export interface TimeframeView {
  timeframe: string;
  trend: TrendState;
  regime: RegimeAssessment;
  momentum: MomentumStateDetail;
  volatility: VolatilityStateDetail;
  structure: StructureState;
  confidenceInputs: MarketContext["confidenceInputs"];
}

export interface MultiTimeframeStructure {
  alignment: MTFAlignment;
  selected: TimeframeView;
  higher: TimeframeView[];
  interaction: string; // human-readable "how the timeframes interact"
  conflicts: string[];
}

export interface MarketStateLayer {
  symbol: string;
  timeframe: string;
  capturedAt: string;
  price: TimestampedValue<number>;
  change24h: number;
  changePercent24h: number;
  trend: TrendState;
  regime: RegimeAssessment;
  momentum: MomentumStateDetail;
  volatility: VolatilityStateDetail;
  structure: StructureState;
  phase: MarketPhase;
  phaseReason: string;
  acceleration: {
    price: number; // normalized bar-over-bar change
    momentum: number; // RSI slope
    volatility: number; // ATR expansion ratio
  };
}

export type ChangeCategory = "STRUCTURAL" | "MOMENTUM" | "VOLATILITY" | "REGIME" | "PRICE" | "RISK" | "EVIDENCE";

export interface StateChange {
  category: ChangeCategory;
  variable: string;
  then: number | string | boolean | null;
  now: number | string | boolean | null;
  absoluteChange?: number;
  percentChange?: number;
  significance: "MAJOR" | "MODERATE" | "MINOR" | "NONE";
  thenTimestamp: string;
  nowTimestamp: string;
  reason?: string;
}

export interface Hypothesis {
  id: string;
  label: string;
  description: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  status: "SUPPORTED" | "PLAUSIBLE" | "WEAK" | "INSUFFICIENT_DATA";
  confidence: number; // 0..100
  invalidationCondition: string;
}

export interface Contradiction {
  id: string;
  type: string;
  summary: string;
  evidenceA: string;
  evidenceB: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  resolution?: string;
}

export interface InvalidationPlan {
  condition: string;
  level: number;
  source: "support" | "resistance" | "atr" | "structure" | "manual";
  rationale: string;
}

export interface AnalysisResult {
  freshness: DataFreshness;
  freshnessReason?: string;
  marketState: MarketStateLayer | null;
  mtf: MultiTimeframeStructure | null;
  changes: StateChange[];
  evidenceFor: EvidenceItem[];
  evidenceAgainst: EvidenceItem[];
  contradictions: Contradiction[];
  hypotheses: Hypothesis[];
  invalidation: InvalidationPlan | null;
  confidenceInputs: MarketContext["confidenceInputs"];
  metadata: {
    candleCount: number;
    lastCandleTime: string;
    dataSource: string;
    computationTimeMs: number;
  };
}

export interface EvidenceItem {
  id: string;
  text: string;
  type: string;
  source: "deterministic" | "ai" | "user";
  indicator?: string;
  timeframe?: string;
  timestamp: string;
  value?: number | string | boolean;
  direction: "for" | "against" | "neutral";
  significance: string;
  relationship: "direct" | "contextual" | "counter";
  freshness: DataFreshness;
}

// ---------------------------------------------------------------- helpers

function isFresh(timestamp: number, timeframe: string): DataFreshness {
  if (!timestamp || !Number.isFinite(timestamp)) return "UNAVAILABLE";
  const ageMs = Date.now() - timestamp;
  const tfMinutes: Record<string, number> = {
    "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440, "1W": 10080,
  };
  const minutes = tfMinutes[timeframe] ?? 60;
  // Allow 2x the candle interval before calling stale.
  const maxAgeMs = Math.max(minutes * 2, 5) * 60 * 1000;
  return ageMs <= maxAgeMs ? "FRESH" : "STALE";
}

function safeNumber(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  return 0;
}

function pctChange(now: number, then: number): number | undefined {
  if (!then || !Number.isFinite(then) || then === 0) return undefined;
  return ((now - then) / then) * 100;
}

function classifySignificance(
  category: ChangeCategory,
  then: number | string | boolean | null,
  now: number | string | boolean | null
): StateChange["significance"] {
  if (then === null || now === null) return "MAJOR";
  if (typeof then === "boolean" || typeof now === "boolean") {
    return then !== now ? "MAJOR" : "NONE";
  }
  if (typeof then === "string" || typeof now === "string") {
    return String(then) !== String(now) ? "MAJOR" : "NONE";
  }
  const abs = Math.abs(now - then);
  const pct = then !== 0 ? Math.abs(abs / then) : abs > 0 ? 1 : 0;

  switch (category) {
    case "REGIME":
    case "STRUCTURAL":
      return pct > 0 ? "MAJOR" : "NONE";
    case "PRICE":
      if (pct >= 0.03) return "MAJOR";
      if (pct >= 0.01) return "MODERATE";
      if (pct >= 0.003) return "MINOR";
      return "NONE";
    case "MOMENTUM":
      if (abs >= 15) return "MAJOR";
      if (abs >= 8) return "MODERATE";
      if (abs >= 3) return "MINOR";
      return "NONE";
    case "VOLATILITY":
      if (pct >= 0.5) return "MAJOR";
      if (pct >= 0.25) return "MODERATE";
      if (pct >= 0.1) return "MINOR";
      return "NONE";
    case "RISK":
      if (pct >= 0.05) return "MAJOR";
      if (pct >= 0.02) return "MODERATE";
      if (pct >= 0.005) return "MINOR";
      return "NONE";
    default:
      if (pct >= 0.25) return "MAJOR";
      if (pct >= 0.1) return "MODERATE";
      if (pct >= 0.02) return "MINOR";
      return "NONE";
  }
}

// ---------------------------------------------------------------- layers

function buildTrendState(candles: OHLCVCandle[]): TrendState {
  const closes = candles.map((c) => c.close);
  const ema20s = calculateEMA(closes, 20);
  const ema50s = calculateEMA(closes, 50);
  const ema20 = ema20s[ema20s.length - 1];
  const ema50 = ema50s[ema50s.length - 1];
  const price = closes[closes.length - 1];

  let direction: MarketTrend = "FLAT";
  if (price > ema20 && ema20 > ema50) direction = "UP";
  else if (price < ema20 && ema20 < ema50) direction = "DOWN";

  const emaSep = Math.abs(ema20 - ema50);
  const atr = calculateVolatility(candles).atr || price * 0.005;
  const strength = Math.max(0, Math.min(1, emaSep / (atr * 2)));

  // Duration since last EMA cross
  let durationBars = 0;
  for (let i = ema20s.length - 1; i >= 1; i--) {
    const prevUp = ema20s[i - 1] > ema50s[i - 1];
    const currUp = ema20s[i] > ema50s[i];
    if (prevUp === currUp) durationBars++;
    else break;
  }

  const slope20 = ema20s.length > 1 ? (ema20 - ema20s[ema20s.length - 5]) / (price * 4) : 0;

  return {
    direction,
    strength,
    ema20,
    ema50,
    ema200: calculateEMA(closes, 200).at(-1),
    slope20,
    emaSeparationPct: price > 0 ? (emaSep / price) * 100 : 0,
    durationBars,
  };
}

function buildMomentumState(candles: OHLCVCandle[]): MomentumStateDetail {
  const closes = candles.map((c) => c.close);
  const rsiArr = calculateRSI(closes, 14);
  const macdRes = calculateMACD(closes);

  const rsi = rsiArr[rsiArr.length - 1];
  const prevRsi = rsiArr[rsiArr.length - 5] ?? rsi;
  const rsiSlope = (rsi - prevRsi) / 4;

  const macd = macdRes.macd.at(-1) ?? 0;
  const signal = macdRes.signal.at(-1) ?? 0;
  const histogram = macdRes.histogram.at(-1) ?? 0;
  const prevHist = macdRes.histogram.at(-2) ?? histogram;

  let state: MomentumState = "NEUTRAL";
  if (rsi > 70 || rsi < 30) state = "EXHAUSTED";
  else if (Math.abs(rsiSlope) < 1.5) state = "STEADY";
  else if (rsiSlope > 0) state = "ACCELERATING";
  else state = "DECELERATING";

  let macdCrossover: MomentumStateDetail["macdCrossover"] = null;
  if (macdRes.macd.length >= 2 && macdRes.signal.length >= 2) {
    const pm = macdRes.macd.at(-2) ?? 0;
    const ps = macdRes.signal.at(-2) ?? 0;
    if (pm <= ps && macd > signal) macdCrossover = "BULLISH";
    else if (pm >= ps && macd < signal) macdCrossover = "BEARISH";
  }

  // Simple divergence: price higher highs, RSI lower highs = bearish; opposite = bullish
  let divergence: MomentumStateDetail["divergence"] = null;
  let divergenceReason: string | undefined;
  if (candles.length >= 10) {
    const prevCandles = candles.slice(-10, -5);
    const recentCandles = candles.slice(-5);
    const prevHigh = Math.max(...prevCandles.map((c) => c.high));
    const recentHigh = Math.max(...recentCandles.map((c) => c.high));
    const prevLow = Math.min(...prevCandles.map((c) => c.low));
    const recentLow = Math.min(...recentCandles.map((c) => c.low));

    const rsiIndex = rsiArr.length - 1;
    const prevRsiHigh = Math.max(...rsiArr.slice(Math.max(0, rsiIndex - 10), rsiIndex - 5));
    const recentRsiHigh = Math.max(...rsiArr.slice(rsiIndex - 5));
    const prevRsiLow = Math.min(...rsiArr.slice(Math.max(0, rsiIndex - 10), rsiIndex - 5));
    const recentRsiLow = Math.min(...rsiArr.slice(rsiIndex - 5));

    if (recentHigh > prevHigh && recentRsiHigh < prevRsiHigh) {
      divergence = "BEARISH";
      divergenceReason = "Price made a higher high while RSI made a lower high.";
    } else if (recentLow < prevLow && recentRsiLow > prevRsiLow) {
      divergence = "BULLISH";
      divergenceReason = "Price made a lower low while RSI made a higher low.";
    }
  }

  return {
    state,
    rsi,
    rsiLabel: getRsiLabel(rsi),
    macdValue: macd,
    macdSignal: signal,
    macdHistogram: histogram,
    macdCrossover,
    divergence,
    divergenceReason,
  };
}

function getRsiLabel(rsi: number): string {
  if (isNaN(rsi)) return "Awaiting data...";
  if (rsi < 30) return "Oversold";
  if (rsi < 40) return "Weak";
  if (rsi < 50) return "Bearish momentum";
  if (rsi < 60) return "Bullish momentum";
  if (rsi < 70) return "Strong bullish momentum";
  if (rsi < 80) return "Overbought";
  return "Extremely overbought";
}

function buildVolatilityState(candles: OHLCVCandle[]): VolatilityStateDetail {
  const vol = calculateVolatility(candles, 20);
  const price = candles[candles.length - 1]?.close || 1;
  const atrPercent = price > 0 ? (vol.atr / price) * 100 : 0;

  let state: VolatilityState = "NORMAL";
  if (vol.isSpike || vol.standardDeviationPercent > 4) state = "EXTREME";
  else if (vol.standardDeviationPercent < 0.2) state = "DEAD";
  else if (vol.standardDeviationPercent > 1.5) state = "EXPANDING";
  else if (vol.standardDeviationPercent < 0.6) state = "CONTRACTING";

  // Expansion ratio vs 50-bar average ATR
  const fullVol = calculateVolatility(candles, Math.min(50, candles.length - 1));
  const expansionRatio = fullVol.atr > 0 ? vol.atr / fullVol.atr : 1;

  return {
    state,
    atr: vol.atr,
    atrPercent,
    standardDeviationPercent: vol.standardDeviationPercent,
    isSpike: vol.isSpike,
    expansionRatio,
  };
}

function buildStructureState(candles: OHLCVCandle[]): StructureState {
  const levels = calculateKeyLevels(candles);
  const price = candles[candles.length - 1]?.close || 0;
  const range = Math.max(levels.resistance - levels.support, price * 0.001);
  const positionInRange = range > 0 ? (price - levels.support) / range : 0.5;

  const distSupport = levels.support > 0 ? Math.abs(price - levels.support) / levels.support : 1;
  const distResistance = levels.resistance > 0 ? Math.abs(levels.resistance - price) / levels.resistance : 1;
  const nearestLevel = distSupport < distResistance ? "SUPPORT" : distResistance < distSupport ? "RESISTANCE" : null;
  const distanceToNearestLevelPercent = nearestLevel === "SUPPORT" ? distSupport : distResistance;

  const prevPrice = candles[candles.length - 2]?.close ?? price;
  const brokenSupport = prevPrice >= levels.support && price < levels.support;
  const brokenResistance = prevPrice <= levels.resistance && price > levels.resistance;

  const lastCandle = candles[candles.length - 1];
  const liquiditySweep = !!lastCandle && lastCandle.low < levels.support && lastCandle.close > levels.support;
  const fakeBreakout = !!lastCandle && lastCandle.high > levels.resistance && lastCandle.close < levels.resistance;

  return {
    support: levels.support,
    resistance: levels.resistance,
    positionInRange,
    rangePercent: price > 0 ? range / price : 0,
    nearestLevel,
    distanceToNearestLevelPercent,
    brokenSupport,
    brokenResistance,
    liquiditySweep,
    fakeBreakout,
  };
}

function determinePhase(state: MarketStateLayer): MarketPhase {
  if (state.volatility.state === "EXTREME") return "TRANSITIONAL";
  if (state.structure.brokenSupport || state.structure.brokenResistance) {
    return state.trend.direction === "UP" ? "BREAKOUT" : "REVERSAL";
  }
  if (state.regime.regime === "TRENDING_UP" || state.regime.regime === "TRENDING_DOWN") return "TRENDING";
  if (state.regime.regime === "RANGING") return "RANGING";
  if (state.regime.regime === "LOW_VOLATILITY") return "ACCUMULATION";
  if (state.regime.regime === "BREAKOUT" || state.regime.regime === "BREAKDOWN") return "BREAKOUT";
  return "TRANSITIONAL";
}

export function buildMarketStateLayer(
  symbol: string,
  timeframe: string,
  candles: OHLCVCandle[],
  priceData?: { price: number; change24h: number; changePercent24h: number; source?: string }
): { layer: MarketStateLayer; freshness: DataFreshness } {
  const lastCandle = candles[candles.length - 1];
  const freshness = isFresh(lastCandle?.timestamp ?? 0, timeframe);
  const lastCandleTime = lastCandle ? new Date(lastCandle.timestamp).toISOString() : new Date().toISOString();

  const trend = buildTrendState(candles);
  const momentum = buildMomentumState(candles);
  const volatility = buildVolatilityState(candles);
  const structure = buildStructureState(candles);

  const price = priceData?.price ?? lastCandle?.close ?? 0;
  const change24h = priceData?.change24h ?? 0;
  const changePercent24h = priceData?.changePercent24h ?? 0;

  const regime = assessRegime(candles, {
    trend: trend.direction === "UP" ? "BULLISH" : trend.direction === "DOWN" ? "BEARISH" : "SIDEWAYS",
    volatilityPct: volatility.standardDeviationPercent,
    isVolatilitySpike: volatility.isSpike,
    support: structure.support,
    resistance: structure.resistance,
    currentPrice: price,
  });

  const layer: MarketStateLayer = {
    symbol,
    timeframe,
    capturedAt: new Date().toISOString(),
    price: {
      value: price,
      timestamp: lastCandleTime,
      source: priceData?.source ?? (freshness === "FRESH" ? "live" : "last-candle"),
      freshness,
    },
    change24h,
    changePercent24h,
    trend,
    regime,
    momentum,
    volatility,
    structure,
    phase: "TRANSITIONAL",
    phaseReason: "Default phase — computing...",
    acceleration: {
      price: 0,
      momentum: 0,
      volatility: 0,
    },
  };

  layer.phase = determinePhase(layer);
  layer.phaseReason = buildPhaseReason(layer);
  layer.acceleration = {
    price: candles.length > 1 ? (candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close : 0,
    momentum: (momentum.rsi - calculateRSI(candles.map((c) => c.close), 14).slice(-6)[0]) / 5,
    volatility: volatility.expansionRatio - 1,
  };

  return { layer, freshness };
}

function buildPhaseReason(state: MarketStateLayer): string {
  const parts: string[] = [];
  parts.push(`Regime: ${state.regime.label}.`);
  parts.push(`Trend ${state.trend.direction.toLowerCase()} with strength ${(state.trend.strength * 100).toFixed(0)}%.`);
  parts.push(`Momentum ${state.momentum.state.toLowerCase()} (RSI ${state.momentum.rsi.toFixed(1)}).`);
  parts.push(`Volatility ${state.volatility.state.toLowerCase()} (${state.volatility.standardDeviationPercent.toFixed(2)}%).`);
  if (state.structure.nearestLevel) {
    parts.push(`Price is ${(state.structure.distanceToNearestLevelPercent * 100).toFixed(2)}% from ${state.structure.nearestLevel.toLowerCase()}.`);
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------- MTF

async function fetchHigherTimeframes(
  symbol: string,
  timeframe: string,
  fetchHigherTF: (symbol: string, tf: string, limit: number) => Promise<OHLCVCandle[]>
): Promise<TimeframeView[]> {
  const order = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"];
  const idx = order.indexOf(timeframe);
  if (idx < 0 || idx >= order.length - 1) return [];
  const higherTFs = order.slice(idx + 1, Math.min(idx + 3, order.length)).slice(0, 2);

  const views: TimeframeView[] = [];
  for (const htf of higherTFs) {
    try {
      const hCandles = await fetchHigherTF(symbol, htf, 80);
      if (!hCandles || hCandles.length < 52) continue;
      const layer = buildMarketStateLayer(symbol, htf, hCandles);
      views.push(buildTimeframeViewFromLayer(layer.layer));
    } catch {
      // Degrade gracefully
    }
  }
  return views;
}

function buildTimeframeViewFromLayer(layer: MarketStateLayer): TimeframeView {
  return {
    timeframe: layer.timeframe,
    trend: layer.trend,
    regime: layer.regime,
    momentum: layer.momentum,
    volatility: layer.volatility,
    structure: layer.structure,
    confidenceInputs: {
      trendClarity: layer.trend.strength,
      momentumAlignment: layer.momentum.state === "ACCELERATING" || layer.momentum.state === "STEADY" ? 0.8 : 0.4,
      volatilityFit: layer.volatility.state === "NORMAL" || layer.volatility.state === "CONTRACTING" ? 0.8 : 0.3,
      structureQuality: Math.max(0, Math.min(1, layer.structure.distanceToNearestLevelPercent / 0.02)),
      dataQuality: 1,
      mtfAlignment: 0.5,
    },
  };
}

function buildMTFInteraction(selected: TimeframeView, higher: TimeframeView[]): { interaction: string; conflicts: string[] } {
  if (higher.length === 0) return { interaction: "Higher-timeframe context unavailable.", conflicts: [] };

  const selectedUp = selected.trend.direction === "UP";
  const selectedDown = selected.trend.direction === "DOWN";
  const higherUp = higher.every((h) => h.trend.direction === "UP");
  const higherDown = higher.every((h) => h.trend.direction === "DOWN");
  const higherMixed = !higherUp && !higherDown;

  const conflicts: string[] = [];
  let interaction = "";

  if (selectedUp && higherUp) {
    interaction = "Structural trend intact across all visible timeframes — continuation setup.";
  } else if (selectedDown && higherDown) {
    interaction = "Downtrend aligned across all visible timeframes — continuation setup.";
  } else if (selectedUp && higherDown) {
    interaction = "Selected timeframe is bullish, but higher timeframes remain bearish — counter-trend risk.";
    conflicts.push("Selected timeframe trend conflicts with higher-timeframe direction.");
  } else if (selectedDown && higherUp) {
    interaction = "Selected timeframe is bearish, but higher timeframes remain bullish — counter-trend risk.";
    conflicts.push("Selected timeframe trend conflicts with higher-timeframe direction.");
  } else if (higherMixed) {
    interaction = "Higher timeframes are mixed — the directional thesis depends on the selected timeframe alone.";
    conflicts.push("Higher timeframes disagree with each other.");
  } else {
    interaction = "Mixed directional signals across timeframes.";
  }

  // Add momentum/volatility conflicts
  if (selected.trend.direction === "UP" && selected.momentum.state === "DECELERATING") {
    conflicts.push("Selected timeframe trend is up but momentum is decelerating.");
  }
  if (selected.trend.direction === "DOWN" && selected.momentum.state === "DECELERATING") {
    conflicts.push("Selected timeframe trend is down but momentum is decelerating (possible bounce).");
  }
  if (selected.volatility.state === "EXTREME" && selected.structure.positionInRange > 0.85) {
    conflicts.push("Price is extended and volatility is extreme — stop placement is unreliable.");
  }

  return { interaction, conflicts };
}

// ---------------------------------------------------------------- what changed

export function computeStateChanges(
  then: MarketStateLayer | null,
  now: MarketStateLayer | null,
  thenPriceData?: { price: number } | null,
  nowPriceData?: { price: number } | null
): StateChange[] {
  if (!then || !now) {
    if (!now) return [];
    return [{
      category: "EVIDENCE",
      variable: "Prior state",
      then: null,
      now: "Current state available",
      significance: "MAJOR",
      thenTimestamp: now.capturedAt,
      nowTimestamp: now.capturedAt,
      reason: "No prior snapshot for comparison.",
    }];
  }

  const changes: StateChange[] = [];

  const push = (
    category: ChangeCategory,
    variable: string,
    thenVal: number | string | boolean | null,
    nowVal: number | string | boolean | null,
    reason?: string
  ) => {
    const significance = classifySignificance(category, thenVal, nowVal);
    if (significance === "NONE") return;
    const absoluteChange = typeof thenVal === "number" && typeof nowVal === "number" ? nowVal - thenVal : undefined;
    const percentChange = typeof thenVal === "number" && typeof nowVal === "number" ? pctChange(nowVal, thenVal) : undefined;
    changes.push({
      category,
      variable,
      then: thenVal,
      now: nowVal,
      absoluteChange,
      percentChange,
      significance,
      thenTimestamp: then.capturedAt,
      nowTimestamp: now.capturedAt,
      reason,
    });
  };

  push("PRICE", "Price", thenPriceData?.price ?? then.price.value, nowPriceData?.price ?? now.price.value);
  push("REGIME", "Market regime", then.regime.regime, now.regime.regime, then.regime.regime !== now.regime.regime ? `Changed from ${then.regime.label} to ${now.regime.label}.` : undefined);
  push("MOMENTUM", "RSI (14)", then.momentum.rsi, now.momentum.rsi);
  push("MOMENTUM", "Momentum state", then.momentum.state, now.momentum.state);
  push("MOMENTUM", "MACD histogram", then.momentum.macdHistogram, now.momentum.macdHistogram);
  push("VOLATILITY", "Volatility state", then.volatility.state, now.volatility.state);
  push("VOLATILITY", "ATR %", then.volatility.atrPercent, now.volatility.atrPercent);
  push("STRUCTURAL", "Support", then.structure.support, now.structure.support);
  push("STRUCTURAL", "Resistance", then.structure.resistance, now.structure.resistance);
  push("STRUCTURAL", "Position in range", then.structure.positionInRange, now.structure.positionInRange);
  push("STRUCTURAL", "Nearest key level", then.structure.nearestLevel, now.structure.nearestLevel);
  push("RISK", "Distance to nearest level %", then.structure.distanceToNearestLevelPercent, now.structure.distanceToNearestLevelPercent);
  push("RISK", "ATR expansion ratio", then.volatility.expansionRatio, now.volatility.expansionRatio);

  return changes.sort((a, b) => {
    const order = { MAJOR: 0, MODERATE: 1, MINOR: 2, NONE: 3 };
    return order[a.significance] - order[b.significance];
  });
}

// ---------------------------------------------------------------- hypotheses

export function buildAlternativeHypotheses(state: MarketStateLayer): Hypothesis[] {
  const price = state.price.value;
  const support = state.structure.support;
  const resistance = state.structure.resistance;

  const hypotheses: Hypothesis[] = [
    {
      id: "h-continuation",
      label: "Trend continuation",
      description: `The ${state.trend.direction === "UP" ? "uptrend" : state.trend.direction === "DOWN" ? "downtrend" : "sideways drift"} persists and price reaches the next structural level.`,
      evidenceFor: [
        `Trend ${state.trend.direction} with strength ${(state.trend.strength * 100).toFixed(0)}%.`,
        `Regime: ${state.regime.label}.`,
        state.momentum.state === "ACCELERATING" ? `Momentum is accelerating.` : null,
      ].filter((s): s is string => !!s),
      evidenceAgainst: [
        state.momentum.state === "EXHAUSTED" ? `Momentum is exhausted (RSI ${state.momentum.rsi.toFixed(1)}).` : null,
        state.momentum.divergence ? `${state.momentum.divergence} divergence detected.` : null,
        state.structure.positionInRange > 0.85 ? `Price is extended at ${(state.structure.positionInRange * 100).toFixed(0)}% of the range.` : null,
      ].filter((s): s is string => !!s),
      status: "PLAUSIBLE",
      confidence: Math.round(state.trend.strength * 100),
      invalidationCondition: state.trend.direction === "UP"
        ? `A ${state.timeframe} close below ${support.toLocaleString()}.`
        : state.trend.direction === "DOWN"
          ? `A ${state.timeframe} close above ${resistance.toLocaleString()}.`
          : `A decisive close beyond ${support.toLocaleString()} or ${resistance.toLocaleString()}.`,
    },
    {
      id: "h-range",
      label: "Range continuation",
      description: `Price remains between ${support.toLocaleString()} and ${resistance.toLocaleString()} as the market consolidates.`,
      evidenceFor: [
        state.regime.regime === "RANGING" || state.regime.regime === "LOW_VOLATILITY" ? `Regime is ${state.regime.label.toLowerCase()}.` : null,
        state.structure.positionInRange > 0.2 && state.structure.positionInRange < 0.8 ? `Price is inside the range at ${(state.structure.positionInRange * 100).toFixed(0)}%.` : null,
        state.volatility.state === "CONTRACTING" ? `Volatility is contracting.` : null,
      ].filter((s): s is string => !!s),
      evidenceAgainst: [
        state.regime.regime === "TRENDING_UP" || state.regime.regime === "TRENDING_DOWN" ? `Trend regime favors directional moves.` : null,
        state.volatility.state === "EXPANDING" || state.volatility.state === "EXTREME" ? `Volatility expansion often precedes a breakout.` : null,
      ].filter((s): s is string => !!s),
      status: state.regime.regime === "RANGING" ? "SUPPORTED" : state.regime.regime === "TRANSITIONAL" ? "PLAUSIBLE" : "WEAK",
      confidence: state.regime.regime === "RANGING" ? 60 : 30,
      invalidationCondition: `A ${state.timeframe} close outside ${support.toLocaleString()} – ${resistance.toLocaleString()}.`,
    },
    {
      id: "h-failed-breakout",
      label: "Failed breakout / breakdown",
      description: `A structural break occurs but quickly reverses, trapping breakout traders.`,
      evidenceFor: [
        state.structure.fakeBreakout || state.structure.liquiditySweep ? `Recent liquidity sweep or fake breakout detected.` : null,
        state.momentum.state === "EXHAUSTED" ? `Momentum exhaustion supports a reversal.` : null,
        state.volatility.state === "EXTREME" ? `Extreme volatility often produces false breaks.` : null,
      ].filter((s): s is string => !!s),
      evidenceAgainst: [
        state.trend.strength > 0.7 ? `Strong trend makes failed breakout less likely.` : null,
        state.volatility.state === "CONTRACTING" ? `Low volatility usually produces clean breaks.` : null,
      ].filter((s): s is string => !!s),
      status: state.structure.fakeBreakout || state.structure.liquiditySweep ? "PLAUSIBLE" : "INSUFFICIENT_DATA",
      confidence: state.structure.fakeBreakout || state.structure.liquiditySweep ? 45 : 20,
      invalidationCondition: `A ${state.timeframe} close beyond the swept level on expanding volume.`,
    },
    {
      id: "h-reversal",
      label: "Structural reversal",
      description: `The prevailing structure breaks and a new directional leg begins.`,
      evidenceFor: [
        state.momentum.divergence ? `${state.momentum.divergence} divergence signals waning momentum.` : null,
        state.momentum.state === "EXHAUSTED" ? `Momentum exhaustion (RSI ${state.momentum.rsi.toFixed(1)}).` : null,
        state.structure.brokenSupport || state.structure.brokenResistance ? `Key level broken.` : null,
      ].filter((s): s is string => !!s),
      evidenceAgainst: [
        state.trend.strength > 0.7 ? `Strong trend makes reversal unlikely without confirmation.` : null,
        null,
      ].filter((s): s is string => !!s),
      status: (state.momentum.divergence || state.structure.brokenSupport || state.structure.brokenResistance) ? "PLAUSIBLE" : "INSUFFICIENT_DATA",
      confidence: (state.momentum.divergence || state.structure.brokenSupport || state.structure.brokenResistance) ? 40 : 15,
      invalidationCondition: state.trend.direction === "UP"
        ? `A ${state.timeframe} close above ${resistance.toLocaleString()} after the break.`
        : `A ${state.timeframe} close below ${support.toLocaleString()} after the break.`,
    },
  ];

  // Re-score based on evidence balance
  return hypotheses.map((h) => {
    const total = h.evidenceFor.length + h.evidenceAgainst.length;
    const forRatio = total > 0 ? h.evidenceFor.length / total : 0;
    let status: Hypothesis["status"] = h.status;
    if (h.evidenceFor.length >= 3 && forRatio >= 0.7) status = "SUPPORTED";
    else if (forRatio >= 0.4 && h.evidenceFor.length > 0) status = "PLAUSIBLE";
    else if (h.evidenceFor.length > 0) status = "WEAK";
    else status = "INSUFFICIENT_DATA";

    return {
      ...h,
      status,
      confidence: Math.max(0, Math.min(100, Math.round(h.confidence * (0.6 + 0.4 * forRatio)))),
    };
  });
}

// ---------------------------------------------------------------- contradictions

export function detectContradictions(state: MarketStateLayer, mtf: MultiTimeframeStructure | null): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Trend vs momentum
  if (state.trend.direction === "UP" && (state.momentum.state === "EXHAUSTED" || state.momentum.state === "DECELERATING")) {
    contradictions.push({
      id: "c-trend-momentum",
      type: "Trend vs Momentum",
      summary: "Bullish structure but momentum is weakening.",
      evidenceA: `Trend is up (strength ${(state.trend.strength * 100).toFixed(0)}%).`,
      evidenceB: `Momentum is ${state.momentum.state.toLowerCase()} (RSI ${state.momentum.rsi.toFixed(1)}).`,
      impact: state.momentum.divergence ? "HIGH" : "MEDIUM",
      resolution: "Wait for momentum reset or a higher-timeframe confirmation.",
    });
  }
  if (state.trend.direction === "DOWN" && (state.momentum.state === "EXHAUSTED" || state.momentum.state === "DECELERATING")) {
    contradictions.push({
      id: "c-trend-momentum-down",
      type: "Trend vs Momentum",
      summary: "Bearish structure but momentum is weakening (possible bounce).",
      evidenceA: `Trend is down (strength ${(state.trend.strength * 100).toFixed(0)}%).`,
      evidenceB: `Momentum is ${state.momentum.state.toLowerCase()} (RSI ${state.momentum.rsi.toFixed(1)}).`,
      impact: state.momentum.divergence ? "HIGH" : "MEDIUM",
      resolution: "Watch for a relief rally or higher-timeframe support hold.",
    });
  }

  // MTF conflict
  if (mtf?.conflicts.length) {
    for (const conflict of mtf.conflicts) {
      contradictions.push({
        id: `c-mtf-${contradictions.length}`,
        type: "Multi-Timeframe Conflict",
        summary: conflict,
        evidenceA: `Selected TF: ${state.trend.direction}.`,
        evidenceB: `Higher TFs: ${mtf.alignment.alignment.replace("ALIGNED_", "").toLowerCase()}.`,
        impact: "HIGH",
        resolution: "Require alignment or reduce position size/risk.",
      });
    }
  }

  // Structure vs R:R
  if (state.structure.positionInRange > 0.85 && state.trend.direction === "UP") {
    contradictions.push({
      id: "c-structure-risk",
      type: "Structure vs Risk/Reward",
      summary: "Price is extended from support — poor long-entry location.",
      evidenceA: `Price is ${(state.structure.positionInRange * 100).toFixed(0)}% up the range.`,
      evidenceB: `Nearest support is ${(state.structure.distanceToNearestLevelPercent * 100).toFixed(2)}% away.`,
      impact: "MEDIUM",
      resolution: "Wait for a pullback toward support or a fresh breakout confirmation.",
    });
  }
  if (state.structure.positionInRange < 0.15 && state.trend.direction === "DOWN") {
    contradictions.push({
      id: "c-structure-risk-down",
      type: "Structure vs Risk/Reward",
      summary: "Price is extended from resistance — poor short-entry location.",
      evidenceA: `Price is only ${(state.structure.positionInRange * 100).toFixed(0)}% above support.`,
      evidenceB: `Nearest resistance is ${(state.structure.distanceToNearestLevelPercent * 100).toFixed(2)}% away.`,
      impact: "MEDIUM",
      resolution: "Wait for a pullback toward resistance or a fresh breakdown confirmation.",
    });
  }

  // Volatility
  if (state.volatility.state === "EXTREME" && state.trend.strength > 0.6) {
    contradictions.push({
      id: "c-volatility",
      type: "Volatility vs Trend",
      summary: "Strong trend but extreme volatility — stop placement unreliable.",
      evidenceA: `Trend strength ${(state.trend.strength * 100).toFixed(0)}%.`,
      evidenceB: `Volatility ${state.volatility.standardDeviationPercent.toFixed(2)}% (spike).`,
      impact: "HIGH",
      resolution: "Widen stop or wait for volatility contraction before committing.",
    });
  }

  return contradictions;
}

// ---------------------------------------------------------------- invalidation

export function deriveInvalidation(state: MarketStateLayer, direction: "LONG" | "SHORT" | null): InvalidationPlan | null {
  const price = state.price.value;
  const support = state.structure.support;
  const resistance = state.structure.resistance;
  const atr = state.volatility.atr;

  if (!direction) return null;

  let level = 0;
  let source: InvalidationPlan["source"] = "structure";
  let rationale = "";

  if (direction === "LONG") {
    if (support > 0 && support < price) {
      level = support - atr * 0.5;
      source = "support";
      rationale = "Invalidation sits below structural support, buffered by half-ATR to avoid noise.";
    } else {
      level = price - atr * 1.5;
      source = "atr";
      rationale = "No clear support below price; invalidation is set at 1.5x ATR.";
    }
  } else {
    if (resistance > 0 && resistance > price) {
      level = resistance + atr * 0.5;
      source = "resistance";
      rationale = "Invalidation sits above structural resistance, buffered by half-ATR to avoid noise.";
    } else {
      level = price + atr * 1.5;
      source = "atr";
      rationale = "No clear resistance above price; invalidation is set at 1.5x ATR.";
    }
  }

  if (!Number.isFinite(level) || level <= 0) return null;

  return {
    condition: `${direction === "LONG" ? "A close below" : "A close above"} ${level.toLocaleString()} invalidates the directional read.`,
    level,
    source,
    rationale,
  };
}

// ---------------------------------------------------------------- evidence builder 2.0

export function buildEvidenceFromAnalysis(
  state: MarketStateLayer,
  mtf: MultiTimeframeStructure | null,
  direction: "LONG" | "SHORT" | null,
  capturedAt: string
): { for: EvidenceItem[]; against: EvidenceItem[] } {
  const forItems: EvidenceItem[] = [];
  const againstItems: EvidenceItem[] = [];

  const add = (
    side: "for" | "against",
    text: string,
    type: string,
    indicator?: string,
    value?: number | string | boolean,
    significance = "Moderate structural signal",
    relationship: EvidenceItem["relationship"] = "direct"
  ) => {
    const item: EvidenceItem = {
      id: `${side}-${type}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      type,
      source: "deterministic",
      indicator,
      timeframe: state.timeframe,
      timestamp: capturedAt,
      value,
      direction: side,
      significance,
      relationship,
      freshness: state.price.freshness,
    };
    (side === "for" ? forItems : againstItems).push(item);
  };

  // Trend
  if (state.trend.direction === "UP") {
    add("for", `Uptrend intact (EMA20 > EMA50, price above both).`, "trend", "EMA", state.trend.strength, "Strong trend signal");
    if (direction === "SHORT") add("against", `Uptrend contradicts a short thesis.`, "trend", "EMA", state.trend.strength, "Major directional conflict", "counter");
  } else if (state.trend.direction === "DOWN") {
    add("for", `Downtrend intact (EMA20 < EMA50, price below both).`, "trend", "EMA", state.trend.strength, "Strong trend signal");
    if (direction === "LONG") add("against", `Downtrend contradicts a long thesis.`, "trend", "EMA", state.trend.strength, "Major directional conflict", "counter");
  } else {
    add("against", `Trend is flat — directional continuation evidence is weak.`, "trend", "EMA", state.trend.strength, "Weak trend signal", "contextual");
  }

  // Regime
  if (state.regime.regime === "TRENDING_UP") {
    add("for", `Regime: ${state.regime.label} — ${state.regime.reasons[0] || ""}`, "regime", "Market Regime", state.regime.regime, "Strong regime signal");
  } else if (state.regime.regime === "TRENDING_DOWN") {
    add("for", `Regime: ${state.regime.label} — ${state.regime.reasons[0] || ""}`, "regime", "Market Regime", state.regime.regime, "Strong regime signal");
  } else if (state.regime.regime === "RANGING" || state.regime.regime === "LOW_VOLATILITY") {
    add("against", `Regime: ${state.regime.label} — directional theses underperform here.`, "regime", "Market Regime", state.regime.regime, "Hostile regime", "contextual");
  } else if (state.regime.regime === "HIGH_VOLATILITY" || state.regime.regime === "TRANSITIONAL") {
    add("against", `Regime: ${state.regime.label} — execution risk elevated.`, "regime", "Market Regime", state.regime.regime, "Elevated risk", "contextual");
  }

  // Momentum
  if (state.momentum.state === "ACCELERATING") {
    add("for", `Momentum accelerating (RSI ${state.momentum.rsi.toFixed(1)}).`, "momentum", "RSI/MACD", state.momentum.rsi, "Momentum confirmation");
  } else if (state.momentum.state === "DECELERATING") {
    add("against", `Momentum decelerating — potential exhaustion.`, "momentum", "RSI/MACD", state.momentum.rsi, "Momentum warning", "contextual");
  } else if (state.momentum.state === "EXHAUSTED") {
    add("against", `Momentum exhausted (RSI ${state.momentum.rsi.toFixed(1)}).`, "momentum", "RSI", state.momentum.rsi, "Exhaustion warning", "contextual");
  }
  if (state.momentum.macdCrossover === "BULLISH") {
    add("for", `MACD bullish crossover.`, "momentum", "MACD", state.momentum.macdHistogram, "Momentum confirmation");
  } else if (state.momentum.macdCrossover === "BEARISH") {
    add("for", `MACD bearish crossover.`, "momentum", "MACD", state.momentum.macdHistogram, "Momentum confirmation");
  }
  if (state.momentum.divergence) {
    add("against", `${state.momentum.divergence} divergence — ${state.momentum.divergenceReason}`, "momentum", "RSI Divergence", state.momentum.divergence, "Major warning", "contextual");
  }

  // Structure
  if (state.structure.positionInRange < 0.35 && direction === "LONG") {
    add("for", `Price is in the lower portion of the range (${(state.structure.positionInRange * 100).toFixed(0)}%), offering long-side room.`, "structure", "Key Levels", state.structure.positionInRange, "Favorable location");
  } else if (state.structure.positionInRange > 0.65 && direction === "SHORT") {
    add("for", `Price is in the upper portion of the range (${(state.structure.positionInRange * 100).toFixed(0)}%), offering short-side room.`, "structure", "Key Levels", state.structure.positionInRange, "Favorable location");
  }
  if (state.structure.positionInRange > 0.85 && direction === "LONG") {
    add("against", `Price is extended near resistance (${(state.structure.positionInRange * 100).toFixed(0)}% of range).`, "structure", "Key Levels", state.structure.positionInRange, "Poor long location", "contextual");
  } else if (state.structure.positionInRange < 0.15 && direction === "SHORT") {
    add("against", `Price is compressed near support (${(state.structure.positionInRange * 100).toFixed(0)}% of range).`, "structure", "Key Levels", state.structure.positionInRange, "Poor short location", "contextual");
  }
  if (state.structure.liquiditySweep) {
    add("against", `Liquidity sweep detected — recent stop-run below/above structure.`, "structure", "Liquidity", true, "Structural trap warning", "contextual");
  }
  if (state.structure.fakeBreakout) {
    add("against", `Fake breakout detected — the last structural break failed to hold.`, "structure", "Breakout", true, "Structural trap warning", "contextual");
  }

  // Volatility
  if (state.volatility.state === "NORMAL" || state.volatility.state === "CONTRACTING") {
    add("for", `Volatility is ${state.volatility.state.toLowerCase()} (${state.volatility.atrPercent.toFixed(2)}% ATR) — clean stop placement.`, "volatility", "ATR", state.volatility.atrPercent, "Favorable volatility");
  } else if (state.volatility.state === "EXPANDING" || state.volatility.state === "EXTREME") {
    add("against", `Volatility is ${state.volatility.state.toLowerCase()} (${state.volatility.atrPercent.toFixed(2)}% ATR) — stop placement unreliable.`, "volatility", "ATR", state.volatility.atrPercent, "Volatility risk", "contextual");
  }

  // MTF
  if (mtf) {
    if (mtf.alignment.alignment === (direction === "LONG" ? "ALIGNED_BULLISH" : direction === "SHORT" ? "ALIGNED_BEARISH" : "ALIGNED_BULLISH")) {
      add("for", `Multi-timeframe alignment: ${mtf.alignment.alignment.replace("ALIGNED_", "").toLowerCase()}.`, "mtf", "Multi-Timeframe", mtf.alignment.score, "Timeframe confluence");
    } else if (mtf.alignment.alignment === "MIXED") {
      add("against", `Multi-timeframe alignment is mixed — higher timeframes disagree.`, "mtf", "Multi-Timeframe", mtf.alignment.score, "Timeframe conflict", "contextual");
    }
  }

  return { for: forItems, against: againstItems };
}

// ---------------------------------------------------------------- main entry

export interface BuildAnalysisOptions {
  symbol: string;
  timeframe: string;
  candles: OHLCVCandle[];
  priceData?: { price: number; change24h: number; changePercent24h: number; source?: string };
  thenState?: MarketStateLayer | null;
  direction?: "LONG" | "SHORT" | null;
  fetchHigherTF?: (symbol: string, tf: string, limit: number) => Promise<OHLCVCandle[]>;
}

export async function buildMarketAnalysis(options: BuildAnalysisOptions): Promise<AnalysisResult> {
  const t0 = Date.now();
  const { symbol, timeframe, candles, priceData, thenState, direction, fetchHigherTF } = options;

  if (!candles || candles.length < 52) {
    return {
      freshness: "UNAVAILABLE",
      freshnessReason: "Insufficient candle history for a stable analysis.",
      marketState: null,
      mtf: null,
      changes: [],
      evidenceFor: [],
      evidenceAgainst: [],
      contradictions: [],
      hypotheses: [],
      invalidation: null,
      confidenceInputs: {
        trendClarity: 0,
        momentumAlignment: 0,
        volatilityFit: 0,
        structureQuality: 0,
        dataQuality: 0,
        mtfAlignment: 0,
      },
      metadata: {
        candleCount: candles?.length ?? 0,
        lastCandleTime: new Date().toISOString(),
        dataSource: "none",
        computationTimeMs: Date.now() - t0,
      },
    };
  }

  // Legacy context for confidence inputs + MTF
  const { layer, freshness } = buildMarketStateLayer(symbol, timeframe, candles, priceData);
  const legacyCtx = await buildLegacyMarketContext(
    symbol,
    timeframe,
    candles,
    {
      trend: layer.trend.direction === "UP" ? "BULLISH" : layer.trend.direction === "DOWN" ? "BEARISH" : "SIDEWAYS",
      volatilityPct: layer.volatility.standardDeviationPercent,
      isVolatilitySpike: layer.volatility.isSpike,
      support: layer.structure.support,
      resistance: layer.structure.resistance,
      currentPrice: layer.price.value,
      rsi: layer.momentum.rsi,
      macdValue: layer.momentum.macdValue,
      macdSignal: layer.momentum.macdSignal,
      macdHistogram: layer.momentum.macdHistogram,
      atr: layer.volatility.atr,
    },
    fetchHigherTF
  );

  // MTF views from new engine
  const higherViews = fetchHigherTF ? await fetchHigherTimeframes(symbol, timeframe, fetchHigherTF) : [];
  const selectedView = buildTimeframeViewFromLayer(layer);
  const legacyMtf = legacyCtx.mtf;
  let mtfAlignment: MTFAlignment;
  if (legacyMtf) {
    mtfAlignment = legacyMtf;
  } else {
    const fallbackViews = [selectedView].map((v) => ({
      timeframe: v.timeframe,
      trend: v.trend.direction,
      ema20: v.trend.ema20,
      ema50: v.trend.ema50,
      rsi: v.momentum.rsi,
      emaSeparationPct: v.trend.emaSeparationPct,
    }));
    let alignment: MTFAlignment["alignment"] = "NEUTRAL";
    if (higherViews.length > 0) {
      const allSame = higherViews.every((h) => h.trend.direction === selectedView.trend.direction);
      if (allSame) {
        alignment = selectedView.trend.direction === "UP" ? "ALIGNED_BULLISH" : selectedView.trend.direction === "DOWN" ? "ALIGNED_BEARISH" : "NEUTRAL";
      } else {
        alignment = "MIXED";
      }
    }
    const score = higherViews.length === 0
      ? 0
      : higherViews.reduce((s, h) => {
          const dirScore = h.trend.direction === "UP" ? 1 : h.trend.direction === "DOWN" ? -1 : 0;
          return s + dirScore;
        }, 0) / Math.max(1, higherViews.length);
    mtfAlignment = { alignment, score, views: fallbackViews };
  }
  const { interaction, conflicts: mtfConflicts } = buildMTFInteraction(selectedView, higherViews);
  const mtf: MultiTimeframeStructure = {
    alignment: mtfAlignment,
    selected: selectedView,
    higher: higherViews,
    interaction,
    conflicts: mtfConflicts,
  };

  // What changed
  const changes = computeStateChanges(thenState ?? null, layer, thenState?.price ? { price: thenState.price.value } : null, priceData ? { price: priceData.price } : null);

  // Evidence
  const capturedAt = layer.capturedAt;
  const evidence = buildEvidenceFromAnalysis(layer, mtf, direction ?? null, capturedAt);

  // Hypotheses
  const hypotheses = buildAlternativeHypotheses(layer);

  // Contradictions
  const contradictions = detectContradictions(layer, mtf);

  // Invalidation
  const invalidation = deriveInvalidation(layer, direction ?? null);

  return {
    freshness,
    freshnessReason: freshness !== "FRESH" ? `Last candle ${(Date.now() - new Date(candles[candles.length - 1].timestamp).getTime()) / 1000}s old.` : undefined,
    marketState: layer,
    mtf,
    changes,
    evidenceFor: evidence.for,
    evidenceAgainst: evidence.against,
    contradictions,
    hypotheses,
    invalidation,
    confidenceInputs: legacyCtx.confidenceInputs,
    metadata: {
      candleCount: candles.length,
      lastCandleTime: layer.price.timestamp,
      dataSource: priceData?.source ?? "candle-close",
      computationTimeMs: Date.now() - t0,
    },
  };
}

export type { MarketContext, RegimeAssessment, MTFAlignment, OHLCVCandle };
