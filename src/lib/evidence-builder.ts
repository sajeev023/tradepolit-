/**
 * src/lib/evidence-builder.ts
 *
 * EVIDENCE CAPTURE (V2.5) — the flywheel ignition module.
 *
 * Converts the deterministic market context into structured, quotable
 * evidence at analysis time. Every thesis created from an analysis now
 * carries the evidence that existed WHEN the decision was made — the
 * raw material of the labeled-decision dataset.
 *
 * Design rules:
 *  - Deterministic FIRST: every item is derived from verified telemetry
 *    (indicators, regime, MTF) — never LLM-invented.
 *  - The AI may ADD narrative evidence, but it is appended after (and
 *    clearly separable from) the deterministic items.
 *  - Each item is short, human-readable, and time-stamped implicitly by
 *    the analysis it belongs to.
 */

import type { MarketContext } from "./market-context";

export interface EvidenceItem {
  text: string;
  source: "deterministic" | "ai";
  /** Optional structured provenance for V4.1 Evidence Panel. */
  indicator?: string;
  timeframe?: string;
  timestamp?: string;
  value?: string | number;
  direction?: "for" | "against" | "neutral";
  significance?: string;
}

export interface EvidenceSet {
  for: string[];
  against: string[];
}

export interface StructuredEvidenceSet {
  for: EvidenceItem[];
  against: EvidenceItem[];
}

const EVIDENCE_SIGNIFICANCE: Record<string, string> = {
  rsi: "Momentum velocity and magnitude — identifies exhaustion vs continuation.",
  macd: "Momentum shifts and trend agreement between fast/slow EMAs.",
  ema: "Structural direction and trend integrity.",
  regime: "Classification of volatility and directional persistence.",
  mtf: "Directional confluence across higher and lower timeframes.",
  volume: "Participation confirmation behind price moves.",
  volatility: "Expansion vs contraction — affects stop reliability.",
  levels: "High-liquidity inflection zone.",
  ai: "Narrative evidence from the AI reasoning layer.",
};

function classifyEvidence(text: string, side: "for" | "against", timeframe = "1h", capturedAt?: string): EvidenceItem {
  const lower = text.toLowerCase();
  let indicator: string | undefined;
  let significance: string | undefined;
  let value: string | number | undefined;

  if (lower.includes("rsi")) {
    indicator = "RSI (14)";
    significance = EVIDENCE_SIGNIFICANCE.rsi;
    const match = text.match(/RSI\(14\)\s+([\d.]+)/) ?? text.match(/rsi\(14\)\s+([\d.]+)/i);
    if (match) value = Number(match[1]);
  } else if (lower.includes("macd")) {
    indicator = "MACD";
    significance = EVIDENCE_SIGNIFICANCE.macd;
    const match = text.match(/histogram\s+([+-]?[\d.]+)/i);
    if (match) value = Number(match[1]);
  } else if (lower.includes("ema")) {
    indicator = "EMA Crossover";
    significance = EVIDENCE_SIGNIFICANCE.ema;
    const match = text.match(/([\d.]+)\s*%?\s*ema/i);
    if (match) value = `${match[1]}%`;
  } else if (lower.includes("regime")) {
    indicator = "Market Regime";
    significance = EVIDENCE_SIGNIFICANCE.regime;
    const match = text.match(/Regime:\s*([^—]+)/) ?? text.match(/regime:\s*([^—]+)/i);
    if (match) value = match[1].trim();
  } else if (lower.includes("mtf") || lower.includes("multi-timeframe")) {
    indicator = "Multi-Timeframe Alignment";
    significance = EVIDENCE_SIGNIFICANCE.mtf;
    const match = text.match(/alignment\s+([\w\s]+?)\s+across/i);
    if (match) value = match[1].trim();
  } else if (lower.includes("volume")) {
    indicator = "Volume";
    significance = EVIDENCE_SIGNIFICANCE.volume;
    const match = text.match(/([\d.]+)x\s+average/i);
    if (match) value = `${match[1]}x`;
  } else if (lower.includes("volatil") || lower.includes("atr")) {
    indicator = "Volatility";
    significance = EVIDENCE_SIGNIFICANCE.volatility;
    const match = text.match(/σ\s+([\d.]+)%/i) ?? text.match(/volatility\s+([\d.]+)%/i);
    if (match) value = `${match[1]}%`;
  } else if (lower.includes("support") || lower.includes("resistance")) {
    indicator = "Key Level";
    significance = EVIDENCE_SIGNIFICANCE.levels;
    const match = text.match(/\$([\d,.]+)/);
    if (match) value = `$${match[1]}`;
  } else if (lower.startsWith("ai:")) {
    indicator = "AI Synthesis";
    significance = EVIDENCE_SIGNIFICANCE.ai;
  }

  return {
    text,
    source: lower.startsWith("ai:") ? "ai" : "deterministic",
    indicator,
    timeframe,
    timestamp: capturedAt,
    value,
    direction: side,
    significance,
  };
}

export function toStructuredEvidence(set: EvidenceSet, timeframe = "1h", capturedAt?: string): StructuredEvidenceSet {
  return {
    for: set.for.map((t) => classifyEvidence(t, "for", timeframe, capturedAt)),
    against: set.against.map((t) => classifyEvidence(t, "against", timeframe, capturedAt)),
  };
}

interface EvidenceTelemetry {
  rsi: number;
  rsiLabel: string;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  trend: string;
  emaCrossover?: "BULLISH" | "BEARISH" | null;
  macdCrossover?: "BULLISH" | "BEARISH" | null;
  liquiditySweep?: boolean;
  fakeBreakout?: boolean;
  volumeSurgeRatio?: number;
  isVolatilitySpike?: boolean;
  lostVWAP?: boolean;
  approachingKeyLevel?: "SUPPORT" | "RESISTANCE" | null;
}

/**
 * Build deterministic evidence for a directional bias from the market
 * context + telemetry. Items that AGREE with the bias go to `for`;
 * items that CONFLICT go to `against`. NEUTRAL analyses collect both
 * sides symmetrically (they are the "no-trade" evidence case).
 */
export function buildEvidence(
  bias: "LONG" | "SHORT" | null,
  ctx: Pick<MarketContext, "regime" | "mtf" | "confidenceInputs">,
  tech: EvidenceTelemetry
): EvidenceSet {
  const forItems: EvidenceItem[] = [];
  const againstItems: EvidenceItem[] = [];

  const isLong = bias === "LONG";
  const isShort = bias === "SHORT";
  // For NEUTRAL, symmetric evidence: trend-up is evidence FOR longs AND
  // against shorts; we record it in both lists under a neutral framing.

  const add = (side: "for" | "against", text: string) =>
    (side === "for" ? forItems : againstItems).push({ text, source: "deterministic" });

  // ── Regime ────────────────────────────────────────────────────────────
  const regime = ctx.regime.regime;
  const regimeText = `Regime: ${ctx.regime.label}${ctx.regime.reasons[0] ? ` — ${ctx.regime.reasons[0].toLowerCase()}` : ""}`;
  if (regime === "TRENDING_UP") {
    if (isLong) add("for", regimeText);
    else if (isShort) add("against", regimeText);
    else { add("for", `${regimeText} (favors longs)`); add("against", `${regimeText} (counters shorts)`); }
  } else if (regime === "TRENDING_DOWN") {
    if (isShort) add("for", regimeText);
    else if (isLong) add("against", regimeText);
    else { add("for", `${regimeText} (favors shorts)`); add("against", `${regimeText} (counters longs)`); }
  } else if (regime === "HIGH_VOLATILITY" || regime === "TRANSITIONAL") {
    add("against", regimeText + " — execution risk elevated regardless of direction");
  } else if (regime === "BREAKOUT") {
    if (isLong) add("for", regimeText);
    else if (isShort) add("against", regimeText);
    else add("for", regimeText);
  } else if (regime === "BREAKDOWN") {
    if (isShort) add("for", regimeText);
    else if (isLong) add("against", regimeText);
    else add("for", regimeText);
  } else if (regime === "RANGING") {
    add("against", regimeText + " — directional continuation theses underperform in ranges");
  }

  // ── Multi-timeframe alignment ──────────────────────────────────────────
  if (ctx.mtf) {
    const mtfText = `Multi-timeframe: ${ctx.mtf.alignment.replace("ALIGNED_", "").toLowerCase()} across ${ctx.mtf.views.map((v) => `${v.timeframe} ${v.trend.toLowerCase()}`).join(", ")}`;
    if (ctx.mtf.alignment === "ALIGNED_BULLISH") {
      if (isLong) add("for", mtfText); else if (isShort) add("against", mtfText);
    } else if (ctx.mtf.alignment === "ALIGNED_BEARISH") {
      if (isShort) add("for", mtfText); else if (isLong) add("against", mtfText);
    } else if (ctx.mtf.alignment === "MIXED") {
      add("against", mtfText + " — higher timeframes disagree with the selected timeframe");
    }
  }

  // ── Momentum ───────────────────────────────────────────────────────────
  const macdBull = tech.macdValue > tech.macdSignal;
  const macdText = `MACD ${macdBull ? "bullish" : "bearish"} (line ${macdBull ? "above" : "below"} signal, histogram ${tech.macdHistogram >= 0 ? "+" : ""}${tech.macdHistogram.toFixed(2)})`;
  if (macdBull) { if (isLong) add("for", macdText); else if (isShort) add("against", macdText); }
  else { if (isShort) add("for", macdText); else if (isLong) add("against", macdText); }

  const rsiText = `RSI(14) ${tech.rsi.toFixed(1)} (${tech.rsiLabel.toLowerCase()})`;
  if (tech.rsi >= 70) {
    if (isLong) add("against", `${rsiText} — overbought`);
    else if (isShort) add("for", `${rsiText} — overbought`);
    else add("against", `${rsiText} — overbought; late-stage long risk`);
  } else if (tech.rsi <= 30) {
    if (isShort) add("against", `${rsiText} — oversold`);
    else if (isLong) add("for", `${rsiText} — oversold`);
    else add("against", `${rsiText} — oversold; late-stage short risk`);
  } else if (tech.rsi >= 50) { if (isLong) add("for", rsiText); else if (isShort) add("against", rsiText); else add("for", `${rsiText} (momentum leans long)`); }
  else { if (isShort) add("for", rsiText); else if (isLong) add("against", rsiText); else add("for", `${rsiText} (momentum leans short)`); }

  // ── Structural events ──────────────────────────────────────────────────
  if (tech.emaCrossover) {
    const txt = `EMA crossover ${tech.emaCrossover.toLowerCase()} on the selected timeframe`;
    const emaBull = tech.emaCrossover === "BULLISH";
    if (emaBull) { if (isLong) add("for", txt); else if (isShort) add("against", txt); }
    else { if (isShort) add("for", txt); else if (isLong) add("against", txt); }
  }
  if (tech.macdCrossover) {
    const txt = `MACD crossover ${tech.macdCrossover.toLowerCase()}`;
    const mBull = tech.macdCrossover === "BULLISH";
    if (mBull) { if (isLong) add("for", txt); else if (isShort) add("against", txt); }
    else { if (isShort) add("for", txt); else if (isLong) add("against", txt); }
  }
  if (tech.liquiditySweep) add("against", "Liquidity sweep detected — recent stop-run above/below structure; levels may be baited");
  if (tech.fakeBreakout) add("against", "Fake breakout flagged — the last structural break failed to hold");
  if (tech.lostVWAP) add("against", "Price lost VWAP — intraday control shifted against longs");
  if (typeof tech.volumeSurgeRatio === "number" && tech.volumeSurgeRatio >= 1.5) {
    const surgeText = `Volume surge ${tech.volumeSurgeRatio.toFixed(1)}x average — participation confirms the current move`;
    // A surge confirms whatever direction is ALREADY moving (the trend
    // regime). Trending-up + surge = long evidence, short counter-evidence.
    const trendUp = ["TRENDING_UP", "BREAKOUT"].includes(ctx.regime.regime);
    const trendDown = ["TRENDING_DOWN", "BREAKDOWN"].includes(ctx.regime.regime);
    if (trendUp) { if (isShort) add("against", surgeText); else add("for", surgeText); }
    else if (trendDown) { if (isLong) add("against", surgeText); else add("for", surgeText); }
    else add("for", surgeText); // range/breakout-unclassified: neutral confirmation
  } else if (typeof tech.volumeSurgeRatio === "number" && tech.volumeSurgeRatio < 0.8) {
    add("against", `Weak volume (${tech.volumeSurgeRatio.toFixed(1)}x average) — move lacks participation`);
  }
  if (tech.isVolatilitySpike) add("against", "Volatility spike active — stop placement unreliable in this tape");
  if (tech.approachingKeyLevel === "SUPPORT") {
    if (isLong) add("for", "Price approaching support — reaction zone for longs");
    else if (isShort) add("against", "Price approaching support — natural bounce risk for shorts");
  } else if (tech.approachingKeyLevel === "RESISTANCE") {
    if (isShort) add("for", "Price approaching resistance — reaction zone for shorts");
    else if (isLong) add("against", "Price approaching resistance — natural rejection risk for longs");
  }

  // ── Confidence inputs (explicitly surfaced) ─────────────────────────────
  const ci = ctx.confidenceInputs;
  if (ci.trendClarity >= 0.7) add("for", "Trend clearly distinguishable from noise (EMA separation wide vs ATR)");
  else if (ci.trendClarity <= 0.3) add("against", "Trend ambiguous vs noise (EMA separation thin relative to ATR)");

  return {
    for: forItems.map((i) => i.text).slice(0, 12),
    against: againstItems.map((i) => i.text).slice(0, 12),
  };
}

/** Append AI-narrative evidence after the deterministic base. */
export function mergeAiEvidence(base: EvidenceSet, aiFor?: string[], aiAgainst?: string[]): EvidenceSet {
  return {
    for: [...base.for, ...(aiFor ?? []).map((t) => `AI: ${t}`)].slice(0, 15),
    against: [...base.against, ...(aiAgainst ?? []).map((t) => `AI: ${t}`)].slice(0, 15),
  };
}