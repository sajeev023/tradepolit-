/**
 * src/lib/confidence-engine.ts
 *
 * CONFIDENCE ENGINE (V2).
 *
 * "HIGH confidence" must be EARNED from evidence, not asserted by an
 * LLM. This engine computes a deterministic confidence score from the
 * market context (trend clarity, momentum alignment, volatility fit,
 * structure quality, MTF agreement, data quality) and the setup's own
 * characteristics (R:R, conflicting signals).
 *
 * Output:
 *   - score: 0..100
 *   - tier: LOW / MEDIUM / HIGH
 *   - factors: what drove the score UP and DOWN — surfaced in the UI
 *     so the user sees WHY confidence exists.
 */

import type { MarketContext } from "./market-context";

export type ConfidenceTier = "LOW" | "MEDIUM" | "HIGH";

export interface ConfidenceFactor {
  name: string;
  direction: "positive" | "negative" | "neutral";
  weight: number;
  note: string;
}

export interface ConfidenceResult {
  score: number;
  tier: ConfidenceTier;
  factors: ConfidenceFactor[];
}

interface ConfidenceInput {
  marketContext: Pick<MarketContext, "confidenceInputs" | "regime" | "mtf">;
  setup: {
    riskReward: number;
    direction: "LONG" | "SHORT";
  };
  /** Conflicting deterministic signals (from telemetry flags). */
  conflicts?: string[];
  /** Number of candles the computation ran on (drives data-quality honesty). */
  candleCount?: number;
}

// Weights sum to 1.0 across the positive-evidence dimensions.
const W = {
  trendClarity: 0.22,
  momentumAlignment: 0.18,
  mtfAlignment: 0.15,
  structureQuality: 0.12,
  volatilityFit: 0.10,
  dataQuality: 0.08,
  setupRR: 0.15,
};

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { confidenceInputs: ci, regime, mtf } = input.marketContext;
  const factors: ConfidenceFactor[] = [];

  // --- Evidence accumulation (0..1 each) -------------------------------
  let score = 0;

  const addFactor = (name: string, value: number, weight: number, positiveNote: string, negativeNote: string) => {
    score += value * weight * 100;
    const direction: ConfidenceFactor["direction"] = value >= 0.6 ? "positive" : value <= 0.35 ? "negative" : "neutral";
    factors.push({
      name,
      direction,
      weight: Math.round(weight * 100),
      note: direction === "negative" ? negativeNote : positiveNote,
    });
  };

  addFactor(
    "Trend clarity",
    ci.trendClarity,
    W.trendClarity,
    "EMA separation is meaningful relative to volatility — the trend is distinguishable from noise.",
    "EMA separation is thin relative to ATR — trend vs noise is ambiguous."
  );

  addFactor(
    "Momentum alignment",
    ci.momentumAlignment,
    W.momentumAlignment,
    "RSI and MACD agree with the prevailing trend.",
    "Momentum indicators conflict with the trend — signals are mixed."
  );

  addFactor(
    "Multi-timeframe agreement",
    ci.mtfAlignment,
    W.mtfAlignment,
    mtf ? `Higher timeframes ${mtf.alignment === "MIXED" ? "are mixed" : "agree"} with this timeframe's direction.` : "Higher-timeframe context unavailable.",
    mtf ? "Higher timeframes conflict with this timeframe's direction — counter-trend risk." : "Higher-timeframe context unavailable."
  );

  addFactor(
    "Structure quality",
    ci.structureQuality,
    W.structureQuality,
    "Price has room to both key levels — clean risk definition.",
    "Price is pressed against a key level — poor entry location."
  );

  addFactor(
    "Volatility fit",
    ci.volatilityFit,
    W.volatilityFit,
    "Volatility is in a tradeable band — neither dead nor spiking.",
    "Volatility is extreme (spiking) or near-zero — stop placement is unreliable."
  );

  addFactor(
    "Data quality",
    ci.dataQuality,
    W.dataQuality,
    "Sufficient candle history for indicator stability.",
    "Thin candle history — indicator readings are less stable."
  );

  // Setup R:R — capped contribution; 1.5 earns ~half, 3.0 earns full.
  const rrScore = Math.max(0, Math.min(1, (input.setup.riskReward - 1.0) / 2.0));
  addFactor(
    "Risk/reward",
    rrScore,
    W.setupRR,
    `R:R of ${input.setup.riskReward.toFixed(2)}:1 compensates the risk taken.`,
    `R:R of ${input.setup.riskReward.toFixed(2)}:1 is thin for the uncertainty involved.`
  );

  // --- Regime modifiers --------------------------------------------------
  if (regime.regime === "HIGH_VOLATILITY") {
    score *= 0.65;
    factors.push({
      name: "Regime",
      direction: "negative",
      weight: -35,
      note: "High-volatility regime — the same setup carries more execution risk here.",
    });
  } else if (regime.regime === "TRANSITIONAL") {
    score *= 0.85;
    factors.push({
      name: "Regime",
      direction: "negative",
      weight: -15,
      note: "Transitional regime — structure is ambiguous; setups perform worse.",
    });
  } else if (regime.regime === "BREAKOUT" || regime.regime === "BREAKDOWN") {
    score *= 0.9;
    factors.push({
      name: "Regime",
      direction: "neutral",
      weight: -10,
      note: "Breakout regime — momentum is strong but pullback risk is elevated.",
    });
  } else if (regime.regime === "TRENDING_UP" || regime.regime === "TRENDING_DOWN") {
    factors.push({
      name: "Regime",
      direction: "positive",
      weight: 0,
      note: "Directional trend regime — trend-following setups are at home.",
    });
  }

  // --- Explicit conflicting signals --------------------------------------
  for (const c of input.conflicts ?? []) {
    score -= 6;
    factors.push({
      name: "Conflicting signal",
      direction: "negative",
      weight: -6,
      note: c,
    });
  }

  // --- Final tier -----------------------------------------------------------
  score = Math.max(0, Math.min(100, Math.round(score)));
  let tier: ConfidenceTier = "LOW";
  if (score >= 68) tier = "HIGH";
  else if (score >= 45) tier = "MEDIUM";

  // Honesty override: HIGH requires BOTH strong evidence AND no hard
  // conflicts — a high score built on conflicting signals is capped.
  if (tier === "HIGH" && (input.conflicts?.length ?? 0) > 0) {
    tier = "MEDIUM";
    factors.push({
      name: "Confidence cap",
      direction: "negative",
      weight: 0,
      note: "Confidence capped at MEDIUM — conflicting signals are present.",
    });
  }

  return { score, tier, factors };
}