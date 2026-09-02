/**
 * src/lib/trade-logic/setup-synthesis.ts
 *
 * Deterministic setup construction. Given the AI's *selection* (bias
 * + narrative) and the *verified telemetry* (price, support, resistance,
 * ATR), this module computes the trade plan's numbers.
 *
 * The LLM never invents prices. It picks a direction and explains it;
 * we derive entry/stop/invalidation/target from market structure so
 * the plan is mathematically consistent BY CONSTRUCTION.
 */

import type { AIAnalysisPayload, TradeTelemetryContext } from "../trade-validator";

export interface SetupInput {
  analysis: AIAnalysisPayload;
  tech: TradeTelemetryContext;
}

export interface SynthSetup {
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  invalidation: number;
  target: number;
  /** Risk-reward computed from the final numbers — never trusted from text. */
  riskReward: number;
  support: number;
  resistance: number;
  currentPrice: number;
  /** Where each number came from — feeds the UI's data-provenance labels. */
  provenance: {
    entry: "ai" | "structure";
    stopLoss: "ai" | "structure";
    invalidation: "ai" | "structure";
    target: "ai" | "structure";
  };
}

/** Parse the AI's bias into a direction. NEUTRAL/absent → no setup. */
export function parseBias(analysis: AIAnalysisPayload, tech: TradeTelemetryContext): "LONG" | "SHORT" | null {
  const raw = String(analysis.bias ?? tech.bias ?? "").toUpperCase();
  if (raw.includes("BUY") || raw.includes("LONG") || raw.includes("BULLISH")) return "LONG";
  if (raw.includes("SELL") || raw.includes("SHORT") || raw.includes("BEARISH")) return "SHORT";
  return null;
}

function extractNumber(text: unknown): number {
  if (typeof text === "number" && Number.isFinite(text)) return text;
  if (typeof text !== "string") return NaN;
  const normalized = text.replace(/(\d),(?=\d{3})/g, "$1");
  const m = normalized.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

/**
 * Synthesize a structured setup.
 *
 * Priority per field: (1) a plausible AI-provided number within the
 * structure; (2) deterministic derivation from support/resistance/ATR.
 * Whatever wins, the result is re-derived for internal consistency:
 * stop is clamped to structure, invalidation is set beyond the stop,
 * and R:R is recomputed from the final numbers.
 *
 * NEUTRAL / NO-TRADE is a first-class outcome: a NEUTRAL bias has no
 * direction, so NO plan is synthesized (returns null). Callers must
 * handle this — synthesizing a LONG plan from a NEUTRAL thesis (the
 * old `?? "LONG"` fallback) silently invented directional risk.
 */
export function synthSetup(analysis: AIAnalysisPayload, tech: TradeTelemetryContext): SynthSetup | null {
  const direction = parseBias(analysis, tech);
  if (!direction) return null;
  const currentPrice = tech.currentPrice;
  const support = tech.support !== undefined && Number.isFinite(tech.support) && tech.support > 0 ? tech.support : currentPrice * 0.98;
  const resistance = tech.resistance !== undefined && Number.isFinite(tech.resistance) && tech.resistance > 0 ? tech.resistance : currentPrice * 1.02;
  const atr = tech.atr !== undefined && Number.isFinite(tech.atr) && tech.atr > 0 ? tech.atr : currentPrice * 0.008;

  const range = Math.max(resistance - support, atr);
  const stopBuffer = Math.max(atr * 0.5, range * 0.05);

  const aiEntry = extractNumber(analysis.entryIdeas);
  const aiStop = extractNumber(analysis.stopLossIdea);
  const aiTarget = extractNumber(analysis.takeProfitIdea);

  // --- Entry ---------------------------------------------------------------
  let entry: number;
  let entrySource: "ai" | "structure" = "structure";
  if (Number.isFinite(aiEntry) && aiEntry > 0 && Math.abs(aiEntry - currentPrice) / currentPrice < 0.15) {
    entry = aiEntry;
    entrySource = "ai";
  } else {
    // Deterministic pullback entry: just inside the structure edge.
    entry = direction === "LONG" ? Math.min(currentPrice, support + range * 0.25) : Math.max(currentPrice, resistance - range * 0.25);
  }

  // --- Invalidation: the structural thesis-killer level --------------------
  // LONG invalidates below support; SHORT invalidates above resistance.
  // Clamped relative to entry so the thesis is never dead-on-arrival.
  const invalidation =
    direction === "LONG"
      ? support < entry
        ? support
        : entry * 0.995
      : resistance > entry
        ? resistance
        : entry * 1.005;

  // --- Stop loss: at or beyond the invalidation level ------------------------
  // LONG: stop <= invalidation (<= support). SHORT: stop >= invalidation (>= resistance).
  const aiStopStructurallyValid =
    Number.isFinite(aiStop) &&
    aiStop > 0 &&
    (direction === "LONG" ? aiStop < entry && aiStop <= support + stopBuffer : aiStop > entry && aiStop >= resistance - stopBuffer);

  let stopLoss: number;
  let stopSource: "ai" | "structure" = "structure";
  if (aiStopStructurallyValid) {
    stopLoss = aiStop;
    stopSource = "ai";
  } else {
    stopLoss =
      direction === "LONG"
        ? Math.min(support - stopBuffer * 0.5, entry - stopBuffer)
        : Math.max(resistance + stopBuffer * 0.5, entry + stopBuffer);
  }
  // Clamp to the invalidation side so stop-out implies thesis-broken.
  if (direction === "LONG" && stopLoss > invalidation) {
    stopLoss = invalidation;
    stopSource = "structure";
  } else if (direction === "SHORT" && stopLoss < invalidation) {
    stopLoss = invalidation;
    stopSource = "structure";
  }

  // --- Target -----------------------------------------------------------------
  let target: number;
  let targetSource: "ai" | "structure" = "structure";
  if (Number.isFinite(aiTarget) && aiTarget > 0) {
    const plausible = direction === "LONG" ? aiTarget > entry + atr : aiTarget < entry - atr;
    if (plausible) {
      target = aiTarget;
      targetSource = "ai";
    } else {
      target = direction === "LONG" ? Math.max(resistance, entry + range * 0.75) : Math.min(support, entry - range * 0.75);
    }
  } else {
    target = direction === "LONG" ? Math.max(resistance, entry + range * 0.75) : Math.min(support, entry - range * 0.75);
  }

  // --- Enforce the R:R floor by extending the target when needed -------------
  const risk = Math.abs(entry - stopLoss);
  let reward = Math.abs(target - entry);
  if (risk > 0 && reward / risk < 1.5) {
    target = direction === "LONG" ? entry + risk * 1.5 : entry - risk * 1.5;
    targetSource = "structure";
    reward = risk * 1.5;
  }

  const riskReward = risk > 0 ? reward / risk : 0;

  return {
    direction,
    entry,
    stopLoss,
    invalidation,
    target,
    riskReward: Math.round(riskReward * 100) / 100,
    support,
    resistance,
    currentPrice,
    provenance: {
      entry: entrySource,
      stopLoss: stopSource,
      invalidation: "structure",
      target: targetSource,
    },
  };
}