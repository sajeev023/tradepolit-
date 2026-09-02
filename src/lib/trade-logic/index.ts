/**
 * src/lib/trade-logic/index.ts
 *
 * Centralized TRADE LOGIC / VALIDATION ENGINE.
 *
 * Architectural contract (V2):
 *   1. Deterministic code CONSTRUCTS trade setups (setup-synthesis).
 *   2. The LLM SELECTS bias and EXPLAINS; it never invents prices.
 *   3. EVERY path that renders an analysis to a user passes through
 *      validateSetup() — analyze-chart, chat re-analysis, fallbacks,
 *      cache hits, prewarm, thesis creation. No bypasses.
 *   4. Contradictory output is REPAIRED deterministically where the
 *      fix is unambiguous, and REJECTED otherwise.
 *
 * Invariant summary (single source of truth):
 *   LONG:  entry > stopLoss; stopLoss <= invalidation < entry < target
 *   SHORT: entry < stopLoss; stopLoss >= invalidation > entry > target
 *   BOTH:  RR >= minRR (default 1.5); stop distance >= ATR-based buffer;
 *          all prices finite and positive.
 */

import { validateTradeAnalysis, type AIAnalysisPayload, type TradeTelemetryContext, type ValidationResult } from "../trade-validator";
import { synthSetup, type SynthSetup } from "./setup-synthesis";
import { checkInvariants } from "./invariants";
import { repairSetup } from "./repair";

export { synthSetup } from "./setup-synthesis";
export type { SynthSetup } from "./setup-synthesis";
export { repairSetup, type RepairReport } from "./repair";
export { checkInvariants, type InvariantIssue, type InvariantCheckInput } from "./invariants";

export interface ValidateSetupResult {
  /** True when the setup is mathematically consistent and renderable. */
  isValid: boolean;
  /** Issues that remain after repair attempts. Empty when valid. */
  issues: string[];
  /** Issues detected before repair — for logging/regeneration prompts. */
  preRepairIssues: string[];
  /** Deterministic fixes applied, if any. */
  repairs: string[];
  /** The (possibly repaired) setup. Null only when unrepairable. */
  setup: SynthSetup | null;
  /** The full legacy validation result — for the existing 422 flow. */
  legacy: ValidationResult;
}

/**
 * Extract a structured setup from an AI payload, enforce invariants,
 * attempt deterministic repair, and re-check.
 *
 * The legacy validator still runs so narrative-level contradictions
 * (MACD/RSI text mismatches, template junk) keep flowing through the
 * existing regeneration/422 path unchanged.
 */
export function validateSetup(
  analysis: AIAnalysisPayload,
  tech: TradeTelemetryContext,
  options?: { minRRThreshold?: number; minStopBufferPercent?: number }
): ValidateSetupResult {
  const setup = synthSetup(analysis, tech);

  // NEUTRAL / no-direction analysis: valid by definition (it is a
  // "no-trade" read), but there is no plan to validate or render.
  // Return an explicit isValid:true with a null setup so callers can
  // distinguish "valid no-trade" from "invalid plan".
  if (!setup) {
    return {
      isValid: true,
      issues: [],
      preRepairIssues: [],
      repairs: [],
      setup: null,
      legacy: validateTradeAnalysis(analysis, tech),
    };
  }

  const pre = checkInvariants(setup, {
    minRR: options?.minRRThreshold ?? 1.5,
    minStopPercent: options?.minStopBufferPercent ?? 0.001,
  });

  let finalSetup: SynthSetup = setup;
  let issues: string[] = pre;
  let repairs: string[] = [];

  if (issues.length > 0) {
    const repaired = repairSetup(setup, tech, issues);
    if (repaired) {
      const recheck = checkInvariants(repaired.setup, {
        minRR: options?.minRRThreshold ?? 1.5,
        minStopPercent: options?.minStopBufferPercent ?? 0.001,
      });
      if (recheck.length === 0) {
        finalSetup = repaired.setup;
        issues = [];
        repairs = repaired.repairs;
      } else {
        issues = recheck;
      }
    }
  }

  // Re-run the legacy validator with the repaired numbers so narrative
  // checks see consistent values (MACD/RSI text, risk claims, R:R floor).
  const legacyPayload: AIAnalysisPayload = {
    ...analysis,
    entryIdeas: String(finalSetup.entry),
    stopLossIdea: String(finalSetup.stopLoss),
    takeProfitIdea: String(finalSetup.target),
    invalidationLevel: finalSetup.invalidation,
    support: finalSetup.support,
    resistance: finalSetup.resistance,
  };
  const legacy = validateTradeAnalysis(legacyPayload, tech, {
    minRRThreshold: options?.minRRThreshold,
    minStopBufferPercent: options?.minStopBufferPercent,
  });

  // Merge: numeric issues are fully owned by the invariant engine;
  // narrative issues (MACD/RSI/risk/template) come from the legacy checks.
  const narrativeIssues = legacy.issues.filter(
    (s) =>
      s.startsWith("MACD") ||
      s.startsWith("RSI") ||
      s.startsWith("Risk Engine") ||
      s.startsWith("Output Quality") ||
      s.startsWith("Impossible Structure")
  );

  const allIssues = [...issues, ...narrativeIssues];

  return {
    isValid: allIssues.length === 0,
    issues: allIssues,
    preRepairIssues: pre,
    repairs,
    setup: allIssues.length === 0 ? finalSetup : null,
    legacy,
  };
}

/**
 * Deterministic-only variant used by paths that already have a
 * validated narrative and only need the numbers (e.g. thesis creation
 * from a previously validated analysis, cache-hit re-verification).
 */
export function validateSetupNumbers(
  setup: SynthSetup | null,
  options?: { minRRThreshold?: number; minStopBufferPercent?: number }
): { isValid: boolean; issues: string[] } {
  // A NEUTRAL/no-direction analysis has no numbers to validate — callers
  // must reject thesis creation for it upstream (a thesis requires a
  // direction by definition).
  if (!setup) {
    return { isValid: false, issues: ["No directional bias — a thesis requires a LONG or SHORT bias."] };
  }
  const issues = checkInvariants(setup, {
    minRR: options?.minRRThreshold ?? 1.5,
    minStopPercent: options?.minStopBufferPercent ?? 0.001,
  });
  return { isValid: issues.length === 0, issues };
}

export type { AIAnalysisPayload, TradeTelemetryContext, ValidationResult };