/**
 * src/lib/attribution-engine.ts
 *
 * ATTRIBUTION ENGINE (V2.5) — grades the REASONING, not the outcome.
 *
 * The core of the labeled-decision dataset. Given a resolved thesis
 * (with evidence, regime at creation AND resolution, plan adherence,
 * and the user's reported result), deterministically proposes an
 * AttributionLabel. The user confirms or overrides in the review UI —
 * human is the final authority; the engine is the default.
 *
 * Attribution taxonomy (deliberately small and actionable):
 *   GOOD_DECISION_BAD_OUTCOME  — sound process, unlucky result (variance)
 *   BAD_DECISION_GOOD_OUTCOME   — flawed process, paid anyway (luck)
 *   EXECUTION_ERROR             — right idea, wrong entry/sizing/timing
 *   RISK_MANAGEMENT_ERROR       — plan ignored: stop moved, oversize, no stop
 *   REGIME_SHIFT                — market state changed post-entry
 *   INFORMATION_FAILURE         — the evidence was wrong/unavailable, not the reasoning
 *   BEHAVIORAL_ERROR            — emotion-driven deviation (revenge, FOMO)
 *   DATA_QUALITY_ISSUE          — feed/data problem corrupted the read
 */

export type AttributionLabel =
  | "GOOD_DECISION_GOOD_OUTCOME"
  | "GOOD_DECISION_BAD_OUTCOME"
  | "BAD_DECISION_GOOD_OUTCOME"
  | "BAD_DECISION_BAD_OUTCOME"
  | "EXECUTION_ERROR"
  | "RISK_MANAGEMENT_ERROR"
  | "REGIME_SHIFT"
  | "INFORMATION_FAILURE"
  | "BEHAVIORAL_ERROR"
  | "DATA_QUALITY_ISSUE";

export interface AttributionInput {
  thesisStatus: "HIT" | "INVALIDATED" | "EXPIRED";
  bias: "LONG" | "SHORT";
  regimeAtCreation: string | null;
  regimeAtResolution: string | null;
  evidenceFor: string[];
  evidenceAgainst: string[];
  tookTrade: boolean;
  result?: "WIN" | "LOSS" | "BREAKEVEN" | "NO_TRADE";
  followedPlan?: boolean | null;
  /** Position size vs the user's baseline (from linked trade, if any). */
  oversized?: boolean | null;
  /** Behavioral flags from the linked trade (emotion/revenge heuristics). */
  behavioralFlag?: boolean;
}

export interface AttributionProposal {
  label: AttributionLabel;
  reasoning: string;
  alternates: AttributionLabel[];
  /** Signal quality — how deterministic inputs support the proposal. */
  confidence: "high" | "medium" | "low";
}

/** Evidence-quality heuristic: does the FOR side dominate the AGAINST side? */
function evidenceQuality(input: AttributionInput): { dominated: boolean; thin: boolean } {
  const f = input.evidenceFor?.length ?? 0;
  const a = input.evidenceAgainst?.length ?? 0;
  return {
    dominated: f >= a * 2 && f >= 3,
    thin: f + a < 3,
  };
}

function regimeShifted(input: AttributionInput): boolean {
  if (!input.regimeAtCreation || !input.regimeAtResolution) return false;
  return input.regimeAtCreation.trim().toLowerCase() !== input.regimeAtResolution.trim().toLowerCase();
}

/**
 * Propose an attribution label. Priority order matters — the most
 * SEVERE actionable cause wins over generic good/bad buckets, because
 * the purpose is learning, not judgment.
 */
export function proposeAttribution(input: AttributionInput): AttributionProposal {
  const eq = evidenceQuality(input);
  const shifted = regimeShifted(input);
  const alternates: AttributionLabel[] = [];
  const won = input.result === "WIN";

  // ── Non-traded theses: grade the thesis itself ────────────────────────
  if (!input.tookTrade || input.result === "NO_TRADE") {
    // The thesis either resolved correctly (good read) or didn't.
    // The user's "no-trade" is graded on the READING, not P&L.
    if (input.thesisStatus === "HIT") {
      const label: AttributionLabel = eq.dominated ? "GOOD_DECISION_GOOD_OUTCOME" : "GOOD_DECISION_GOOD_OUTCOME";
      return {
        label,
        reasoning: eq.dominated
          ? "The evidence supported the thesis and the market confirmed it — a well-reasoned read (you observed rather than traded; the process grade is high)."
          : "The thesis played out, though the recorded evidence was thin — confirm this was analysis-driven conviction rather than a lucky direction call.",
        alternates: eq.dominated ? [] : ["GOOD_DECISION_GOOD_OUTCOME"],
        confidence: eq.dominated ? "high" : "medium",
      };
    }
    // INVALIDATED / EXPIRED non-traded:
    if (shifted) {
      return {
        label: "REGIME_SHIFT",
        reasoning: `The market state changed between thesis creation (${input.regimeAtCreation}) and resolution (${input.regimeAtResolution}) — the read may have been right for the market that existed when you made it.`,
        alternates: ["GOOD_DECISION_BAD_OUTCOME"],
        confidence: "medium",
      };
    }
    if (eq.dominated) {
      return {
        label: "GOOD_DECISION_BAD_OUTCOME",
        reasoning: "Evidence clearly supported the thesis but the market invalidated it — this is variance, not a process failure. The correct lesson is usually 'nothing'.",
        alternates: ["REGIME_SHIFT"],
        confidence: "medium",
      };
    }
    if (eq.thin) {
      return {
        label: "BAD_DECISION_BAD_OUTCOME",
        reasoning: "The thesis had little recorded evidence and the market rejected it — the process (analysis depth), not the outcome, is the thing to fix.",
        alternates: ["INFORMATION_FAILURE"],
        confidence: "medium",
      };
    }
    return {
      label: "BAD_DECISION_BAD_OUTCOME",
      reasoning: "The market invalidated a thesis whose evidence was contested — review whether the entry criteria were actually met at decision time.",
      alternates: ["GOOD_DECISION_BAD_OUTCOME"],
      confidence: "low",
    };
  }

  // ── Traded theses: the error taxonomy first, then good/bad buckets ────
  // 1. Risk management violations override everything — the decision may
  //    have been fine; the risk behavior was not.
  if (input.followedPlan === false) {
    if (input.oversized) {
      return {
        label: "RISK_MANAGEMENT_ERROR",
        reasoning: "You deviated from the plan AND the position was oversized relative to your baseline — this is a risk-management failure regardless of the entry idea.",
        alternates: ["BEHAVIORAL_ERROR"],
        confidence: "high",
      };
    }
    if (input.behavioralFlag) {
      return {
        label: "BEHAVIORAL_ERROR",
        reasoning: "The deviation came in a flagged emotional context (revenge/FOMO pattern) — the process break was psychological, not analytical.",
        alternates: ["RISK_MANAGEMENT_ERROR"],
        confidence: "medium",
      };
    }
    return {
      label: input.thesisStatus === "HIT" && won
        ? "BAD_DECISION_GOOD_OUTCOME"
        : "EXECUTION_ERROR",
      reasoning:
        input.thesisStatus === "HIT" && won
          ? "You deviated from the plan and still won — that is luck rewarding indiscipline, the most dangerous pattern to reinforce. Grade it as a bad decision."
          : "The idea may have been sound but the execution deviated from the plan — entry timing, sizing, or management broke the thesis before the market could.",
      alternates: input.thesisStatus === "HIT" && won ? ["EXECUTION_ERROR"] : ["RISK_MANAGEMENT_ERROR"],
      confidence: "medium",
    };
  }

  // 2. Regime shift post-entry (plan followed): information/environment change.
  if (shifted && !won) {
    return {
      label: "REGIME_SHIFT",
      reasoning: `You followed the plan, but the market changed character mid-thesis (${input.regimeAtCreation} → ${input.regimeAtResolution}). The decision was reasonable for the information available at entry.`,
      alternates: ["GOOD_DECISION_BAD_OUTCOME"],
      confidence: "medium",
    };
  }

  // 3. Clean buckets by evidence quality × outcome.
  if (won) {
    if (eq.dominated) {
      return {
        label: "GOOD_DECISION_GOOD_OUTCOME",
        reasoning: "Strong evidence, plan followed, market confirmed — the full-stack correct process. Note what made this one easy to take.",
        alternates: [],
        confidence: "high",
      };
    }
    return {
      label: "BAD_DECISION_GOOD_OUTCOME",
      reasoning: "The thesis had contested or thin evidence, you followed it, and it paid anyway. Luck — do not update your process upward off this trade.",
      alternates: ["GOOD_DECISION_GOOD_OUTCOME"],
      confidence: "medium",
    };
  }

  // lost, plan followed, no regime shift:
  if (eq.dominated) {
    return {
      label: "GOOD_DECISION_BAD_OUTCOME",
      reasoning: "Evidence was strong and the plan was followed — the loss is variance. The correct response is to take the same setup next time.",
      alternates: ["REGIME_SHIFT"],
      confidence: "medium",
    };
  }
  if (eq.thin) {
    return {
      label: "BAD_DECISION_BAD_OUTCOME",
      reasoning: "Thin evidence, followed anyway, and it lost — the fix is at the decision stage: require more evidence before committing capital.",
      alternates: ["EXECUTION_ERROR"],
      confidence: "medium",
    };
  }
  return {
    label: "BAD_DECISION_BAD_OUTCOME",
    reasoning: "Contested evidence and a losing outcome — review the entry criteria; the market told you what the indicators couldn't.",
    alternates: ["GOOD_DECISION_BAD_OUTCOME", "INFORMATION_FAILURE"],
    confidence: "low",
  };
}

export const ATTRIBUTION_LABELS: { value: AttributionLabel; label: string; hint: string }[] = [
  { value: "GOOD_DECISION_GOOD_OUTCOME", label: "Good decision, good outcome", hint: "Sound process, paid as expected" },
  { value: "GOOD_DECISION_BAD_OUTCOME", label: "Good decision, bad outcome", hint: "Sound process, variance won — no lesson needed" },
  { value: "BAD_DECISION_GOOD_OUTCOME", label: "Bad decision, good outcome", hint: "Flawed process, paid anyway — luck, don't reinforce it" },
  { value: "BAD_DECISION_BAD_OUTCOME", label: "Bad decision, bad outcome", hint: "Flawed process, lost — fix the process" },
  { value: "EXECUTION_ERROR", label: "Execution error", hint: "Right idea, wrong entry/timing/management" },
  { value: "RISK_MANAGEMENT_ERROR", label: "Risk-management error", hint: "Oversized, no stop, or stop moved" },
  { value: "REGIME_SHIFT", label: "Regime shift", hint: "Market changed character after entry" },
  { value: "INFORMATION_FAILURE", label: "Information failure", hint: "The evidence itself was wrong or missing" },
  { value: "BEHAVIORAL_ERROR", label: "Behavioral error", hint: "Emotion-driven deviation (revenge, FOMO)" },
  { value: "DATA_QUALITY_ISSUE", label: "Data-quality issue", hint: "Feed or data problem corrupted the read" },
];