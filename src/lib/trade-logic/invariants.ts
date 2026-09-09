/**
 * src/lib/trade-logic/invariants.ts
 *
 * The single source of truth for trade-plan consistency. Every setup
 * that reaches a user — from any path — must pass these rules.
 *
 *   LONG:  entry > stopLoss; stopLoss <= invalidation; target > entry
 *   SHORT: entry < stopLoss; stopLoss >= invalidation; target < entry
 *   BOTH:  RR >= minRR; stop distance >= minStopPercent of entry;
 *          all prices finite, positive, and sane vs current price.
 */

export interface InvariantCheckInput {
  minRR: number;
  /** Minimum stop distance as a fraction of entry (e.g. 0.001 = 0.1%). */
  minStopPercent: number;
}

export interface InvariantCheckSetup {
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  invalidation: number;
  target: number;
  riskReward?: number;
  support?: number;
  resistance?: number;
  currentPrice?: number;
}

export interface InvariantIssue {
  code: string;
  message: string;
}

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function checkInvariants(setup: InvariantCheckSetup, opts: InvariantCheckInput): string[] {
  const issues: string[] = [];
  const { direction, entry, stopLoss, invalidation, target } = setup;

  // --- Sanity: every price must be finite and positive -----------------
  for (const [name, value] of [
    ["Entry", entry],
    ["Stop Loss", stopLoss],
    ["Invalidation", invalidation],
    ["Target", target],
  ] as const) {
    if (!isFinitePositive(value)) {
      issues.push(`${name} Violation: ${name} price must be a finite positive number (got ${value}).`);
    }
  }
  // Nothing else is checkable with NaN prices.
  if (issues.length > 0) return issues;

  // --- Directional core (the SHORT-bug class) ---------------------------
  if (direction === "LONG") {
    if (!(stopLoss < entry)) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) must be strictly below Entry ($${entry}).`);
    }
    if (!(stopLoss <= invalidation)) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) cannot be above Invalidation level ($${invalidation}).`);
    }
    if (!(invalidation < entry)) {
      issues.push(`Invalidation Violation (LONG): Invalidation ($${invalidation}) must be below Entry ($${entry}).`);
    }
    if (!(target > entry)) {
      issues.push(`Take Profit Violation (LONG): Target ($${target}) must be strictly above Entry ($${entry}).`);
    }
  } else {
    if (!(stopLoss > entry)) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) must be strictly above Entry ($${entry}).`);
    }
    if (!(stopLoss >= invalidation)) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) cannot be below Invalidation level ($${invalidation}).`);
    }
    if (!(invalidation > entry)) {
      issues.push(`Invalidation Violation (SHORT): Invalidation ($${invalidation}) must be above Entry ($${entry}).`);
    }
    if (!(target < entry)) {
      issues.push(`Take Profit Violation (SHORT): Target ($${target}) must be strictly below Entry ($${entry}).`);
    }
  }

  // --- Structural alignment with support/resistance when present --------
  if (Number.isFinite(setup.support) && setup.support !== undefined && setup.support > 0) {
    if (direction === "LONG" && stopLoss > setup.support) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) should sit at or below Support ($${setup.support}).`);
    }
    if (direction === "SHORT" && target > setup.support) {
      issues.push(`Take Profit Violation (SHORT): Target ($${target}) should sit at or below Support ($${setup.support}).`);
    }
  }
  if (Number.isFinite(setup.resistance) && setup.resistance !== undefined && setup.resistance > 0) {
    if (direction === "SHORT" && stopLoss < setup.resistance) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) should sit at or above Resistance ($${setup.resistance}).`);
    }
    if (direction === "LONG" && target < setup.resistance) {
      issues.push(`Take Profit Violation (LONG): Target ($${target}) should sit at or above Resistance ($${setup.resistance}).`);
    }
  }

  // --- Risk floor --------------------------------------------------------
  const riskAmount = Math.abs(entry - stopLoss);
  const rewardAmount = Math.abs(target - entry);
  const computedRR = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  const stopPercent = entry > 0 ? riskAmount / entry : 0;

  if (direction === "LONG" || direction === "SHORT") {
    if (computedRR > 0 && computedRR < opts.minRR) {
      issues.push(`Risk:Reward Violation: Calculated R:R is ${computedRR.toFixed(2)}:1, below the ${opts.minRR}:1 minimum.`);
    }
    const statedRR = setup.riskReward;
    if (statedRR !== undefined && Number.isFinite(statedRR) && computedRR > 0 && Math.abs(statedRR - computedRR) / computedRR > 0.05) {
      issues.push(`Risk:Reward Mismatch: Stated R:R (${statedRR.toFixed(2)}) deviates from computed (${computedRR.toFixed(2)}).`);
    }
  }
  if (stopPercent < opts.minStopPercent) {
    issues.push(`Entry Logic Violation: Stop distance (${(stopPercent * 100).toFixed(3)}%) is below the minimum volatility buffer (${(opts.minStopPercent * 100).toFixed(2)}%).`);
  }

  // --- Price sanity vs current market price ------------------------------
  if (Number.isFinite(setup.currentPrice) && setup.currentPrice !== undefined && setup.currentPrice > 0) {
    const drift = Math.abs(entry - setup.currentPrice) / setup.currentPrice;
    if (drift > 0.25) {
      issues.push(`Entry Sanity Violation: Entry ($${entry}) is ${(drift * 100).toFixed(1)}% away from the live price ($${setup.currentPrice}) — beyond the 25% plausibility band.`);
    }
  }

  return issues;
}