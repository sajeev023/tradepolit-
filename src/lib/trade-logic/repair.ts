/**
 * src/lib/trade-logic/repair.ts
 *
 * Deterministic repair for contradictory setups. When the invariant
 * engine flags a setup, we attempt an unambiguous fix rather than
 * bouncing the user to an error — or worse, showing a broken plan.
 *
 * Repairs are conservative and total: a repair is only accepted if the
 * repaired setup passes ALL invariants; otherwise the original issues
 * stand and the caller regenerates/rejects.
 */

import { checkInvariants, type InvariantCheckInput } from "./invariants";
import type { SynthSetup } from "./setup-synthesis";

export interface RepairReport {
  setup: SynthSetup;
  repairs: string[];
}

/**
 * Attempt to repair a setup given the detected issues and telemetry.
 * Returns null when no deterministic fix is expressible (e.g. NaN
 * prices) — the caller must then regenerate or reject.
 */
export function repairSetup(
  setup: SynthSetup,
  tech: { currentPrice: number; support?: number; resistance?: number; atr?: number },
  _issues: string[],
  opts?: Partial<InvariantCheckInput>
): RepairReport | null {
  const currentPrice = tech.currentPrice;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const support = Number.isFinite(tech.support!) && tech.support! > 0 ? tech.support! : currentPrice * 0.98;
  const resistance = Number.isFinite(tech.resistance!) && tech.resistance! > 0 ? tech.resistance! : currentPrice * 1.02;
  const atr = Number.isFinite(tech.atr!) && tech.atr! > 0 ? tech.atr! : currentPrice * 0.008;
  const range = Math.max(resistance - support, atr);
  const buffer = Math.max(atr * 0.5, range * 0.05);

  const repairs: string[] = [];
  const next: SynthSetup = { ...setup, provenance: { ...setup.provenance } };
  const minRR = opts?.minRR ?? 1.5;
  const minStopPercent = opts?.minStopPercent ?? 0.001;

  const dir = setup.direction;
  const isLong = dir === "LONG";

  // 1. If entry is missing/implausible, reset to the deterministic entry.
  if (!Number.isFinite(next.entry) || next.entry <= 0 || Math.abs(next.entry - currentPrice) / currentPrice > 0.25) {
    next.entry = isLong ? Math.min(currentPrice, support + range * 0.25) : Math.max(currentPrice, resistance - range * 0.25);
    next.provenance.entry = "structure";
    repairs.push("Entry was missing or implausible; recomputed from market structure.");
  }

  // 2. Stop must sit on the correct side, at/below support (LONG) or
  //    at/above resistance (SHORT), with a minimum volatility buffer.
  let stopLoss = next.stopLoss;
  if (!Number.isFinite(stopLoss) || stopLoss <= 0 || (isLong && stopLoss >= next.entry) || (!isLong && stopLoss <= next.entry)) {
    stopLoss = isLong ? Math.min(support - buffer * 0.5, next.entry - buffer) : Math.max(resistance + buffer * 0.5, next.entry + buffer);
    repairs.push(isLong ? "Stop loss moved below support with an ATR buffer." : "Stop loss moved above resistance with an ATR buffer.");
  }
  if (isLong && stopLoss > support + buffer * 0.5) {
    stopLoss = support - buffer * 0.5;
    repairs.push("Stop loss clamped below support (LONG).");
  }
  if (!isLong && stopLoss < resistance - buffer * 0.5) {
    stopLoss = resistance + buffer * 0.5;
    repairs.push("Stop loss clamped above resistance (SHORT).");
  }
  if (isLong && stopLoss >= next.entry) stopLoss = next.entry - buffer;
  if (!isLong && stopLoss <= next.entry) stopLoss = next.entry + buffer;
  next.stopLoss = stopLoss;

  // 3. Invalidation is the structural thesis-killer: support (LONG) /
  //    resistance (SHORT), clamped relative to entry.
  const inv = isLong
    ? support < next.entry
      ? support
      : next.entry * 0.995
    : resistance > next.entry
      ? resistance
      : next.entry * 1.005;
  if (inv !== next.invalidation) {
    next.invalidation = inv;
    repairs.push("Invalidation realigned to the structural thesis-invalidation level.");
  }

  // 4. Stop must sit at or beyond the invalidation level.
  if (isLong && next.stopLoss > next.invalidation) {
    next.stopLoss = next.invalidation;
    repairs.push("Stop loss clamped to the invalidation level (LONG).");
  } else if (!isLong && next.stopLoss < next.invalidation) {
    next.stopLoss = next.invalidation;
    repairs.push("Stop loss clamped to the invalidation level (SHORT).");
  }

  // 5. Target must sit on the correct side; extend to satisfy the R:R floor.
  let target = next.target;
  if (!Number.isFinite(target) || target <= 0 || (isLong && target <= next.entry) || (!isLong && target >= next.entry)) {
    target = isLong ? Math.max(resistance, next.entry + range * 0.75) : Math.min(support, next.entry - range * 0.75);
    next.provenance.target = "structure";
    repairs.push(isLong ? "Take profit re-anchored above entry at resistance." : "Take profit re-anchored below entry at support.");
  }
  const risk = Math.abs(next.entry - next.stopLoss);
  if (risk > 0 && Math.abs(target - next.entry) / risk < minRR) {
    target = isLong ? next.entry + risk * minRR : next.entry - risk * minRR;
    next.provenance.target = "structure";
    repairs.push(`Target extended to satisfy the ${minRR}:1 minimum risk-reward.`);
  }
  next.target = target;

  // 6. Recompute R:R from final numbers — never trust a stated value.
  next.riskReward = risk > 0 ? Math.round((Math.abs(target - next.entry) / risk) * 100) / 100 : 0;

  // Accept only if the repaired setup passes every invariant.
  const remaining = checkInvariants(next, { minRR, minStopPercent });
  if (remaining.length > 0) return null;

  return { setup: next, repairs };
}