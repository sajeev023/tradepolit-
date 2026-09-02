/**
 * src/lib/prose-guard.ts
 *
 * PROSE GUARD (V3) — deterministic check on free-text AI replies.
 *
 * The structured analysis path (safeParseAIResponse + validateSetup) is
 * fully gated. The coach's CHAT replies are not — the prompt mandates
 * citing specific prices ("your invalidation is [specific price]"), so
 * the LLM's free text can contain numbers that contradict telemetry or
 * the validated plan.
 *
 * This module extracts price-like citations from prose and validates
 * them against the verified telemetry + validated trade plan:
 *   - a cited level must be within a plausible band of current price
 *   - a cited stop/invalidation must sit on the correct SIDE for the
 *     stated direction (the SHORT-bug class, in prose form)
 *   - a cited entry/stop/target that matches the validated plan is
 *     always accepted
 *
 * The guard never REWRITES the AI silently. Out-of-band citations are
 * flagged with an inline correction notice — the user sees both the
 * claim and the verified value. Trust through visibility, not illusion.
 */

export interface ProseTelemetry {
  currentPrice: number;
  support: number;
  resistance: number;
  invalidation?: number;
  bias?: string; // "BUY/LONG" | "SELL/SHORT" | "NEUTRAL" | ...
}

export interface ProsePlan {
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  invalidation: number;
  target: number;
}

export interface ProseGuardResult {
  /** Citations that passed validation (matched plan or plausible band). */
  okCount: number;
  /** Violations found — each becomes an inline correction notice. */
  violations: {
    cited: number;
    context: string;
    reason: string;
    verifiedValue: number | null;
  }[];
}

/** Plausibility band around current price for generic level citations. */
const BAND = 0.25; // ±25% — generous: catch wildly-fabricated numbers,
// not stylistic rounding (the narrow checks below handle precision).

/** Extract $-prefixed or comma-formatted price citations with context. */
function extractCitations(text: string): { value: number; context: string }[] {
  const out: { value: number; context: string }[] = [];
  // Match $65,341.07, $65,341, 65341.07 (after "at/ near/ of/ is"),
  // with surrounding context for classification.
  const re = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d{4,}(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, "");
    const value = parseFloat(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    // Skip small integers that are clearly not prices (counts, percents,
    // R multiples, years). Heuristic: prices are >= 10 or decimal-precision.
    const isDecimal = m[1].includes(".");
    if (!isDecimal && value < 10) continue;
    // Skip obvious non-price patterns: percentages, R-multiples, years.
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (after.startsWith("%")) continue;
    if (/^[0-9.]*R\b/.test(after)) continue; // 2.5R, 1R, 0.8R
    // Years: the capture plus immediately-following digits forming 19xx/20xx.
    if (/^(19|20)\d\d/.test(m[1] + after.replace(/[^0-9]/g, "").slice(0, 2)) && /^(19|20)/.test(m[1])) continue;
    if (/minute|hour|day|week|month|year|trades?|candles?|users?|times?|days?/i.test(after)) continue;
    // Context for classification (what the citation claims to be).
    const ctxWindow = `${before}${m[0]}${after}`;
    out.push({ value, context: ctxWindow.toLowerCase() });
    if (out.length >= 40) break; // hard cap
  }
  return out;
}

function classifyContext(context: string): "stop" | "invalidation" | "entry" | "target" | "support" | "resistance" | "level" {
  if (/stop[- ]?loss|your stop/.test(context)) return "stop";
  if (/invalidat/.test(context)) return "invalidation";
  if (/entry|enter (at|near)|limit (near|at)/.test(context)) return "entry";
  if (/target|take[- ]?profit|tp\b/.test(context)) return "target";
  if (/support/.test(context)) return "support";
  if (/resistance/.test(context)) return "resistance";
  return "level";
}

/**
 * Validate prose citations. `plan` may be null (NEUTRAL / no plan) —
 * then only the plausibility band + S/R checks apply.
 */
export function guardProse(text: string, telemetry: ProseTelemetry, plan: ProsePlan | null): ProseGuardResult {
  const citations = extractCitations(text);
  const violations: ProseGuardResult["violations"] = [];
  let okCount = 0;

  const isLong = plan ? plan.direction === "LONG" : (telemetry.bias ?? "").toUpperCase().includes("BUY") || (telemetry.bias ?? "").toUpperCase().includes("LONG");
  const isShort = plan ? plan.direction === "SHORT" : (telemetry.bias ?? "").toUpperCase().includes("SELL") || (telemetry.bias ?? "").toUpperCase().includes("SHORT");

  for (const c of citations) {
    const kind = classifyContext(c.context);

    // 0. Absurd-distance check FIRST: a citation wildly outside the
    //    plausibility band is a hallucination regardless of what it
    //    claims to be — the directional-side check only makes sense for
    //    values that could plausibly be a real level.
    const nearKnownLevel0 = [telemetry.support, telemetry.resistance, telemetry.currentPrice, ...(telemetry.invalidation ? [telemetry.invalidation] : [])]
      .some((v) => Math.abs(v - c.value) / v < 0.02);
    const inBand = Math.abs(c.value - telemetry.currentPrice) / telemetry.currentPrice <= BAND;
    const planNums = plan ? [plan.entry, plan.stopLoss, plan.invalidation, plan.target] : [];
    const matchesPlan = planNums.some((p) => Math.abs(p - c.value) / p < 0.002);

    if (!matchesPlan && !inBand && !nearKnownLevel0) {
      violations.push({
        cited: c.value,
        context: c.context.trim().slice(0, 80),
        reason: `The cited level ($${c.value.toLocaleString()}) is far from the live price ($${telemetry.currentPrice.toLocaleString()}) and matches no verified structure level — it was likely generated from stale model memory.`,
        verifiedValue: null,
      });
      continue;
    }

    // 1. Exact/near match to the validated plan is always accepted.
    if (matchesPlan) {
      okCount++;
      continue;
    }

    // 2. Directional-side check for stop/invalidation citations — the
    //    SHORT-bug class in prose. A "stop" on the wrong side of price
    //    for the stated direction is a hard violation. (Only reachable
    //    for in-band values — step 0 already removed absurd distances.)
    if ((kind === "stop" || kind === "invalidation") && (isLong || isShort)) {
      const wrongSide = isLong ? c.value >= telemetry.currentPrice : c.value <= telemetry.currentPrice;
      if (wrongSide) {
        const verified = telemetry.invalidation ?? (isLong ? telemetry.support : telemetry.resistance);
        violations.push({
          cited: c.value,
          context: c.context.trim().slice(0, 80),
          reason: `The cited ${kind} ($${c.value.toLocaleString()}) sits on the wrong side of the current price ($${telemetry.currentPrice.toLocaleString()}) for a ${isLong ? "LONG" : "SHORT"} thesis.`,
          verifiedValue: verified,
        });
        continue;
      }
    }

    okCount++;
  }

  return { okCount, violations };
}

/**
 * Append inline correction notices for violations. The AI text stays
 * intact (never silently rewritten); corrections render after it.
 */
export function renderProseCorrections(result: ProseGuardResult): string {
  if (result.violations.length === 0) return "";
  const lines = result.violations.map((v) => {
    const verified = v.verifiedValue !== null ? ` Verified ${kindOf(v.context)} level: $${v.verifiedValue.toLocaleString()}.` : "";
    return `- ${v.reason}${verified}`;
  });
  return `\n\n---\n**⚠ Verified-data correction:** ${lines.length === 1 ? "" : "the following citations failed deterministic validation against live telemetry:\n"}${lines.join("\n")}`;
}

function kindOf(context: string): string {
  if (/stop/.test(context)) return "stop";
  if (/invalidat/.test(context)) return "invalidation";
  if (/entry|enter/.test(context)) return "entry";
  if (/target|take/.test(context)) return "target";
  return "structure";
}