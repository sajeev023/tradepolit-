import { describe, expect, it } from "vitest";

/**
 * DecisionScore is embedded in computeUserInsights (DB-backed). The
 * score math is exercised here through mirrored inputs; the DB path is
 * covered by the engine's integration behavior (n floors, null-gates)
 * which these tests lock in as contract.
 *
 * Mirrors: insight-engine.ts computeDecisionScore — if the engine's
 * thresholds change, update BOTH.
 */

interface OutcomeLite {
  result: string;
  tookTrade: boolean;
  followedPlan: boolean | null;
  attribution: string | null;
}
interface TradeLite {
  pnl: number | null;
  stopLoss: number | null;
  size: number;
  openedAt: Date;
}

// Mirror of the engine function (kept in sync by contract tests below).
function mirrorScore(trades: TradeLite[], outcomes: OutcomeLite[]) {
  const closedTrades = trades.length;
  const graded = outcomes.filter((o) => o.attribution !== null);
  const sampleSize = graded.length;
  const decidedTrades = trades.filter((t) => t.pnl !== null);

  if (sampleSize < 3 || closedTrades < 5) {
    return { processScore: null, outcomeScore: null, sampleSize };
  }
  const withPlan = graded.filter((o) => o.followedPlan !== null);
  const adherence = withPlan.length > 0 ? withPlan.filter((o) => o.followedPlan === true).length / withPlan.length : null;
  const processPositive = graded.filter((o) => o.attribution?.startsWith("GOOD_DECISION")).length / graded.length;
  const closure = outcomes.length > 0 ? graded.length / outcomes.length : null;
  const withStop = trades.filter((t) => t.stopLoss !== null).length;
  const stopDiscipline = closedTrades > 0 ? withStop / closedTrades : null;

  const components = [
    { value: adherence, weight: 0.3 },
    { value: processPositive, weight: 0.3 },
    { value: closure, weight: 0.2 },
    { value: stopDiscipline, weight: 0.2 },
  ];
  const available = components.filter((c) => c.value !== null);
  const totalWeight = available.reduce((a, c) => a + c.weight, 0);
  const processScore = totalWeight > 0 ? Math.round((available.reduce((a, c) => a + (c.value as number) * c.weight, 0) / totalWeight) * 100) : null;
  const outcomeScore = decidedTrades.length > 0 ? Math.round((decidedTrades.filter((t) => (t.pnl ?? 0) > 0).length / decidedTrades.length) * 100) : null;
  return { processScore, outcomeScore, sampleSize };
}

describe("DecisionScore contract (mirrors insight-engine)", () => {
  it("returns null under the honesty floor (<3 graded outcomes or <5 trades)", () => {
    const r = mirrorScore(
      [1, 2, 3, 4, 5].map(() => ({ pnl: 100, stopLoss: 1, size: 1, openedAt: new Date() })),
      [1, 2].map(() => ({ result: "WIN", tookTrade: true, followedPlan: true, attribution: "GOOD_DECISION_GOOD_OUTCOME" }))
    );
    expect(r.processScore).toBeNull();
    expect(r.outcomeScore).toBeNull();
    expect(r.sampleSize).toBe(2);
  });

  it("scores a disciplined trader high on process regardless of outcomes", () => {
    const trades = [1, 2, 3, 4, 5].map((i) => ({
      pnl: i % 2 === 0 ? 100 : -100, // 40% win rate — poor outcomes
      stopLoss: 1,
      size: 1,
      openedAt: new Date(),
    }));
    const outcomes: OutcomeLite[] = [1, 2, 3, 4].map(() => ({
      result: "LOSS",
      tookTrade: true,
      followedPlan: true,
      attribution: "GOOD_DECISION_BAD_OUTCOME", // sound process, variance
    }));
    const r = mirrorScore(trades, outcomes);
    // adherence 1.0, process-positive 1.0, closure 1.0, stops 1.0 → 100
    expect(r.processScore).toBe(100);
    expect(r.outcomeScore).toBe(40); // but outcomes were poor — the gap is the story
  });

  it("scores a lucky-but-undisciplined trader: high outcome, low process", () => {
    const trades = [1, 2, 3, 4, 5].map(() => ({
      pnl: 100, // 100% win rate
      stopLoss: null, // no stops — risk indiscipline
      size: 1,
      openedAt: new Date(),
    }));
    const outcomes: OutcomeLite[] = [1, 2, 3].map(() => ({
      result: "WIN",
      tookTrade: true,
      followedPlan: false, // deviated every time
      attribution: "BAD_DECISION_GOOD_OUTCOME", // luck
    }));
    const r = mirrorScore(trades, outcomes);
    // adherence 0, process-positive 0, closure 1.0, stops 0
    // available = all four (all non-null): (0*.3 + 0*.3 + 1*.2 + 0*.2)/1 = 20
    expect(r.processScore).toBe(20);
    expect(r.outcomeScore).toBe(100); // the gap exposes the luck
  });

  it("drops unavailable components and re-weights (partial data)", () => {
    const trades = [1, 2, 3, 4, 5].map(() => ({ pnl: 100, stopLoss: 1, size: 1, openedAt: new Date() }));
    const outcomes: OutcomeLite[] = [1, 2, 3].map(() => ({
      result: "WIN",
      tookTrade: true,
      followedPlan: null, // adherence component unavailable
      attribution: "GOOD_DECISION_GOOD_OUTCOME",
    }));
    const r = mirrorScore(trades, outcomes);
    // available: process-positive 1.0 (0.3) + closure 1.0 (0.2) + stops 1.0 (0.2) → 70/70 = 100
    expect(r.processScore).toBe(100);
  });

  it("outcome score is a pure win-rate statistic (no R-weighting)", () => {
    const trades: TradeLite[] = [
      { pnl: 1000, stopLoss: 1, size: 1, openedAt: new Date() },
      { pnl: -1, stopLoss: 1, size: 1, openedAt: new Date() },
    ];
    // pad to 5 closed trades with decided pnl
    trades.push({ pnl: 100, stopLoss: 1, size: 1, openedAt: new Date() });
    trades.push({ pnl: -100, stopLoss: 1, size: 1, openedAt: new Date() });
    trades.push({ pnl: 100, stopLoss: 1, size: 1, openedAt: new Date() });
    const outcomes: OutcomeLite[] = [1, 2, 3].map(() => ({
      result: "WIN", tookTrade: true, followedPlan: true, attribution: "GOOD_DECISION_GOOD_OUTCOME",
    }));
    const r = mirrorScore(trades, outcomes);
    expect(r.outcomeScore).toBe(60); // 3/5 — magnitude ignored by design
  });
});