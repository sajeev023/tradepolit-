import type { RiskProfile, RiskParams } from "./types";

export const RISK_PROFILES: Record<RiskProfile, RiskParams> = {
  CONSERVATIVE: {
    riskPerTradePct: 0.5,
    maxDailyLossPct: 2,
    maxDrawdownPct: 8,
    maxOpenPositions: 2,
    maxPositionPct: 30,
    stopAtrMultiple: 3,
    rewardRisk: 3,
  },
  BALANCED: {
    riskPerTradePct: 1,
    maxDailyLossPct: 3,
    maxDrawdownPct: 15,
    maxOpenPositions: 3,
    maxPositionPct: 45,
    stopAtrMultiple: 3,
    rewardRisk: 3,
  },
  AGGRESSIVE: {
    riskPerTradePct: 2,
    maxDailyLossPct: 6,
    maxDrawdownPct: 25,
    maxOpenPositions: 3,
    maxPositionPct: 60,
    stopAtrMultiple: 3,
    rewardRisk: 3,
  },
};

/** Crypto spot pairs Autopilot can trade — real Binance candles only. */
export const SUPPORTED_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD"] as const;

export type GoalVerdict = "PLAUSIBLE" | "AMBITIOUS" | "VERY_UNLIKELY" | "INVALID";

export interface GoalAssessment {
  verdict: GoalVerdict;
  requiredReturnPct: number;
  /** Compounded monthly return needed to hit the target on time. */
  requiredMonthlyPct: number;
  message: string;
}

export const GOAL_LIMITS = {
  minBalance: 100,
  maxBalance: 1_000_000,
  minHorizonDays: 7,
  maxHorizonDays: 730,
} as const;

/**
 * Honest arithmetic on the goal — not a prediction of success. It reports what
 * return the target demands and how that compares to what is realistic.
 */
export function assessGoal(startingBalance: number, targetBalance: number, horizonDays: number): GoalAssessment {
  const { minBalance, maxBalance, minHorizonDays, maxHorizonDays } = GOAL_LIMITS;
  const invalid = (message: string): GoalAssessment => ({
    verdict: "INVALID",
    requiredReturnPct: 0,
    requiredMonthlyPct: 0,
    message,
  });

  if (!Number.isFinite(startingBalance) || startingBalance < minBalance || startingBalance > maxBalance) {
    return invalid(`Starting balance must be between $${minBalance} and $${maxBalance.toLocaleString("en-US")}.`);
  }
  if (!Number.isFinite(targetBalance) || targetBalance <= startingBalance) {
    return invalid("Target must be higher than your starting balance.");
  }
  if (!Number.isFinite(horizonDays) || horizonDays < minHorizonDays || horizonDays > maxHorizonDays) {
    return invalid(`Time frame must be between ${minHorizonDays} and ${maxHorizonDays} days.`);
  }

  const ratio = targetBalance / startingBalance;
  const requiredReturnPct = (ratio - 1) * 100;
  const requiredMonthlyPct = (Math.pow(ratio, 30 / horizonDays) - 1) * 100;
  const need = `${requiredReturnPct.toFixed(0)}% in ${horizonDays} days is about ${requiredMonthlyPct.toFixed(1)}% per month, compounded.`;

  if (requiredMonthlyPct <= 3) {
    return {
      verdict: "PLAUSIBLE",
      requiredReturnPct,
      requiredMonthlyPct,
      message: `${need} That is within the range disciplined traders sometimes reach, but nothing is guaranteed.`,
    };
  }
  if (requiredMonthlyPct <= 10) {
    return {
      verdict: "AMBITIOUS",
      requiredReturnPct,
      requiredMonthlyPct,
      message: `${need} That is well above what most traders sustain. Expect large swings, and a real chance of falling short.`,
    };
  }
  return {
    verdict: "VERY_UNLIKELY",
    requiredReturnPct,
    requiredMonthlyPct,
    message: `${need} Targets like this usually require risking far more than the guardrails allow. Most accounts that try this lose money. Autopilot will not break its risk limits to chase it.`,
  };
}
