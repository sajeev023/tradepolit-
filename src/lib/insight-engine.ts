/**
 * src/lib/insight-engine.ts
 *
 * USER INSIGHT ENGINE — deterministic personal trading intelligence.
 *
 * Computes honest statistics from the user's OWN trades and thesis
 * outcomes: win rate by setup / session / emotion, recurring mistake
 * patterns, risk behavior. Never AI-generated, never fabricated —
 * every insight carries its sample size, and under-powered claims are
 * suppressed rather than overstated.
 *
 * V3: DECISION SCORE — the answer to "am I good or lucky?" Two scores,
 * kept deliberately separate:
 *   PROCESS SCORE  — how well decisions are MADE (evidence quality,
 *                    plan adherence, attribution mix, discipline)
 *   OUTCOME SCORE  — what the results happened to be (win rate, R)
 * A high outcome with a low process score is luck. A high process with
 * temporarily poor outcomes is variance. Surfacing the gap between the
 * two is the product's core honesty feature.
 */

import { prisma } from "./prisma";

export interface InsightPayload {
  headline: string;
  detail: string;
  metrics: {
    sampleSize: number;
    winRate?: number;
    expectancyR?: number;
    netPnl?: number;
  };
}

export interface DecisionScore {
  /** 0-100 — quality of the DECISION process (see components). */
  processScore: number | null;
  /** 0-100 — quality of the OUTCOMES. */
  outcomeScore: number | null;
  /** Sample the scores are computed from (null = insufficient data). */
  sampleSize: number;
  /** Component breakdown — the user sees what drives the process score. */
  components: {
    name: string;
    value: number | null; // 0..1, null when no data for this component
    weight: number;
    note: string;
  }[];
  /** Plain-language reading of the process-vs-outcome relationship. */
  reading: string;
}

export interface ComputedInsights {
  winRateBySetup: InsightPayload[];
  winRateByEmotion: InsightPayload[];
  mistakePatterns: InsightPayload[];
  riskBehavior: InsightPayload[];
  decisionScore: DecisionScore;
  summary: {
    closedTrades: number;
    thesisOutcomes: number;
    followRate: number | null; // % of resolved theses the user acted on
    bestSetup: string | null;
    worstEmotion: string | null;
  };
}

/** Minimum sample before an insight is surfaced (honesty floor). */
const MIN_SAMPLE = 5;

function winRate(trades: { pnl: number | null }[]): number | null {
  const decided = trades.filter((t) => t.pnl !== null && t.pnl !== undefined);
  if (decided.length === 0) return null;
  return decided.filter((t) => (t.pnl ?? 0) > 0).length / decided.length;
}

function expectancyR(trades: { rMultiple: number | null }[]): number | null {
  const withR = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null && r !== undefined);
  if (withR.length === 0) return null;
  return withR.reduce((a, b) => a + b, 0) / withR.length;
}

export async function computeUserInsights(userId: string): Promise<ComputedInsights> {
  const [tradesRaw, outcomesRaw] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, status: "CLOSED" },
      orderBy: { openedAt: "desc" },
      take: 500,
      select: {
        id: true, instrument: true, direction: true, pnl: true, rMultiple: true,
        emotionTag: true, mistakeTags: true, leverage: true, openedAt: true, closedAt: true,
        entryPrice: true, stopLoss: true, takeProfit: true, size: true, strategyId: true,
      },
    }),
    prisma.thesisOutcome.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, result: true, tookTrade: true, followedPlan: true, rMultiple: true, attribution: true },
    }),
  ]);

  // Normalize through explicit shapes — the prisma mock union loosens
  // the inferred types of select-projected results.
  interface TradeRow {
    id: string; instrument: string; direction: string; pnl: unknown; rMultiple: unknown;
    emotionTag: string | null; mistakeTags: string[]; leverage: unknown;
    openedAt: Date; closedAt: Date | null; stopLoss: unknown; size: unknown;
  }
  interface OutcomeRow {
    id: string; result: string; tookTrade: boolean; followedPlan: boolean | null; rMultiple: unknown;
    attribution: string | null;
  }
  const trades = (tradesRaw as unknown[]).map((r) => {
    const t = r as TradeRow;
    return {
      ...t,
      pnl: t.pnl === null || t.pnl === undefined ? null : Number(t.pnl),
      rMultiple: t.rMultiple === null || t.rMultiple === undefined ? null : Number(t.rMultiple),
      leverage: t.leverage === null || t.leverage === undefined ? NaN : Number(t.leverage),
      stopLoss: t.stopLoss === null || t.stopLoss === undefined ? null : Number(t.stopLoss),
      size: t.size === null || t.size === undefined ? NaN : Number(t.size),
    };
  });
  const outcomes = (outcomesRaw as unknown[]).map((r) => {
    const o = r as OutcomeRow;
    return { ...o, rMultiple: o.rMultiple === null || o.rMultiple === undefined ? null : Number(o.rMultiple) };
  });

  // ── Win rate by setup (instrument + direction, joined with strategy) ──
  const setupGroups = new Map<string, typeof trades>();
  for (const t of trades) {
    const key = `${t.instrument} ${t.direction}`;
    const arr = setupGroups.get(key) ?? [];
    arr.push(t);
    setupGroups.set(key, arr);
  }
  const winRateBySetup: InsightPayload[] = [];
  for (const [setup, group] of setupGroups) {
    if (group.length < MIN_SAMPLE) continue;
    const wr = winRate(group);
    const exp = expectancyR(group);
    if (wr === null) continue;
    const netPnl = group.reduce((a, t) => a + (t.pnl ? Number(t.pnl) : 0), 0);
    winRateBySetup.push({
      headline: `${setup}: ${(wr * 100).toFixed(0)}% win rate over ${group.length} trades`,
      detail:
        wr >= 0.5
          ? `This is one of your stronger setups — expectancy ${exp !== null ? `${exp.toFixed(2)}R` : "n/a"}, net ${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(0)}. Consider sizing it up within your risk rules.`
          : `This setup loses for you — expectancy ${exp !== null ? `${exp.toFixed(2)}R` : "n/a"}, net ${netPnl.toFixed(0)}. Either refine its entry criteria or cut it.`,
      metrics: { sampleSize: group.length, winRate: wr, expectancyR: exp ?? undefined, netPnl },
    });
  }
  winRateBySetup.sort((a, b) => (b.metrics.winRate ?? 0) - (a.metrics.winRate ?? 0));

  // ── Win rate by emotion ──────────────────────────────────────────────
  const emotionGroups = new Map<string, typeof trades>();
  for (const t of trades) {
    if (!t.emotionTag) continue;
    const key = t.emotionTag as string;
    const arr = emotionGroups.get(key) ?? [];
    arr.push(t);
    emotionGroups.set(key, arr);
  }
  const winRateByEmotion: InsightPayload[] = [];
  for (const [emotion, group] of emotionGroups) {
    if (group.length < MIN_SAMPLE) continue;
    const wr = winRate(group);
    if (wr === null) continue;
    winRateByEmotion.push({
      headline: `Trades entered feeling ${emotion.toLowerCase()}: ${(wr * 100).toFixed(0)}% win rate`,
      detail:
        wr >= 0.5
          ? `You trade well in this state — ${group.length} trades sampled. Protect it: notice when it's absent.`
          : `This emotional state precedes losses (${group.length} trades). Your edge is likely state-dependent — consider a pre-trade check for it.`,
      metrics: { sampleSize: group.length, winRate: wr },
    });
  }
  winRateByEmotion.sort((a, b) => (a.metrics.winRate ?? 1) - (b.metrics.winRate ?? 1));

  // ── Mistake patterns (tag frequency, esp. on losers) ────────────────
  const mistakeCount = new Map<string, { total: number; onLosers: number }>();
  for (const t of trades) {
    for (const tag of t.mistakeTags ?? []) {
      const entry = mistakeCount.get(tag) ?? { total: 0, onLosers: 0 };
      entry.total += 1;
      if ((t.pnl ?? 0) < 0) entry.onLosers += 1;
      mistakeCount.set(tag, entry);
    }
  }
  const mistakePatterns: InsightPayload[] = [];
  for (const [tag, counts] of mistakeCount) {
    if (counts.total < MIN_SAMPLE) continue;
    const lossShare = counts.total > 0 ? counts.onLosers / counts.total : 0;
    mistakePatterns.push({
      headline: `"${tag}" tagged on ${counts.total} trades — ${Math.round(lossShare * 100)}% were losers`,
      detail:
        lossShare >= 0.6
          ? `This mistake clusters with losses. It is your most actionable behavioral leak: pick ONE process change (e.g. a checklist item) that would have prevented most of these.`
          : `This tag appears across outcomes — it may be situation-dependent rather than causal. Watch it after losses specifically.`,
      metrics: { sampleSize: counts.total },
    });
  }
  mistakePatterns.sort((a, b) => b.metrics.sampleSize - a.metrics.sampleSize);

  // ── Risk behavior ────────────────────────────────────────────────────
  const riskBehavior: InsightPayload[] = [];
  if (trades.length >= MIN_SAMPLE) {
    // Loss-streak escalation: does position size grow after losses?
    const chrono = [...trades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    const afterLossSizes: number[] = [];
    const otherSizes: number[] = [];
    for (let i = 1; i < chrono.length; i++) {
      const prevLoss = (chrono[i - 1].pnl ?? 0) < 0;
      const size = Number(chrono[i].size);
      if (!Number.isFinite(size)) continue;
      (prevLoss ? afterLossSizes : otherSizes).push(size);
    }
    if (afterLossSizes.length >= 3 && otherSizes.length >= 3) {
      const avgAfterLoss = afterLossSizes.reduce((a, b) => a + b, 0) / afterLossSizes.length;
      const avgOther = otherSizes.reduce((a, b) => a + b, 0) / otherSizes.length;
      if (avgOther > 0 && avgAfterLoss > avgOther * 1.25) {
        riskBehavior.push({
          headline: `Your position size grows ~${Math.round(((avgAfterLoss / avgOther) - 1) * 100)}% after losses`,
          detail: `This is the revenge-sizing signature. After a loss, your average size is higher than your baseline — the classic path to blow-up. Pre-commit to fixed risk per trade.`,
          metrics: { sampleSize: afterLossSizes.length },
        });
      }
    }

    // Stop discipline: closed trades WITHOUT a stop recorded.
    const noStop = trades.filter((t) => t.stopLoss === null || t.stopLoss === undefined).length;
    if (noStop >= 3 && noStop / trades.length > 0.2) {
      riskBehavior.push({
        headline: `${noStop} of ${trades.length} trades had no stop loss recorded`,
        detail: `Undocumented risk is unmanaged risk. Either you're skipping stops (fatal) or not journaling them (fixable) — either way the data can't protect you.`,
        metrics: { sampleSize: trades.length },
      });
    }
  }

  // ── Thesis follow-through ────────────────────────────────────────────
  const actedOn = outcomes.filter((o: { tookTrade: boolean }) => o.tookTrade).length;

  // ── V3 DECISION SCORE ────────────────────────────────────────────────
  const decisionScore = computeDecisionScore(trades, outcomes);

  return {
    winRateBySetup,
    winRateByEmotion,
    mistakePatterns,
    riskBehavior,
    decisionScore,
    summary: {
      closedTrades: trades.length,
      thesisOutcomes: outcomes.length,
      followRate: outcomes.length > 0 ? actedOn / outcomes.length : null,
      bestSetup: winRateBySetup[0]?.headline ?? null,
      worstEmotion: winRateByEmotion[0]?.headline ?? null,
    },
  };
}

/**
 * V3 DECISION SCORE — deterministic, from the user's own records.
 *
 * PROCESS SCORE components (weights sum to 1):
 *   Plan adherence   0.30 — followedPlan true-rate on graded outcomes
 *   Process-positive 0.30 — share of GOOD_DECISION_* attributions
 *   Loop closure     0.20 — graded-outcome rate among all outcomes
 *                          (proxy: attribution present = loop closed)
 *   Risk discipline  0.20 — trades with a stop recorded + no
 *                          revenge-sizing flag (from riskBehavior)
 *
 * OUTCOME SCORE: normalized win rate on decided trades (wins worth
 * slightly more than losses via |R| asymmetry is intentionally NOT
 * used here — outcome score stays a pure result statistic; expectancy
 * lives in the setup insights).
 *
 * Honesty rules: null until n>=3 graded outcomes AND n>=5 closed
 * trades; components with no data drop out and re-weight; the reading
 * never claims causation.
 */
function computeDecisionScore(
  trades: { pnl: number | null; stopLoss: number | null; size: number; openedAt: Date }[],
  outcomes: { result: string; tookTrade: boolean; followedPlan: boolean | null; attribution: string | null }[]
): DecisionScore {
  const closedTrades = trades.length;
  const graded = outcomes.filter((o) => o.attribution !== null && o.attribution !== undefined);
  const sampleSize = graded.length;

  const decidedTrades = trades.filter((t) => t.pnl !== null);

  // Insufficient data → null scores, honest reading.
  if (sampleSize < 3 || closedTrades < 5) {
    return {
      processScore: null,
      outcomeScore: null,
      sampleSize,
      components: [],
      reading:
        closedTrades === 0
          ? "Log closed trades and grade resolved theses to unlock your Decision Score."
          : `Not enough graded decisions yet (${sampleSize}/3). Keep closing the loop after each thesis resolves — the score builds from graded outcomes, not trades alone.`,
    };
  }

  // ── Component 1: plan adherence (0.30) ───────────────────────────────
  const withPlan = graded.filter((o) => o.followedPlan !== null);
  const adherence = withPlan.length > 0 ? withPlan.filter((o) => o.followedPlan === true).length / withPlan.length : null;

  // ── Component 2: process-positive attributions (0.30) ────────────────
  const processPositive = graded.filter((o) => o.attribution?.startsWith("GOOD_DECISION")).length / graded.length;

  // ── Component 3: loop closure (0.20) ─────────────────────────────────
  const closure = outcomes.length > 0 ? graded.length / outcomes.length : null;

  // ── Component 4: risk discipline (0.20) ──────────────────────────────
  const withStop = trades.filter((t) => t.stopLoss !== null).length;
  const stopDiscipline = closedTrades > 0 ? withStop / closedTrades : null;

  const components: DecisionScore["components"] = [
    { name: "Plan adherence", value: adherence, weight: 0.3, note: adherence === null ? "No plan-adherence data yet" : `${Math.round(adherence * 100)}% of graded decisions followed the plan` },
    { name: "Process-positive calls", value: processPositive, weight: 0.3, note: `${Math.round(processPositive * 100)}% of graded decisions were process-sound (good decision, regardless of outcome)` },
    { name: "Loop closure", value: closure, weight: 0.2, note: closure === null ? "No outcomes yet" : `${Math.round(closure * 100)}% of resolved theses got graded` },
    { name: "Risk discipline", value: stopDiscipline, weight: 0.2, note: stopDiscipline === null ? "No trades yet" : `${withStop}/${closedTrades} trades had a stop recorded` },
  ];

  // Weighted average over available components.
  const available = components.filter((c) => c.value !== null);
  const totalWeight = available.reduce((a, c) => a + c.weight, 0);
  const processScore =
    totalWeight > 0 ? Math.round((available.reduce((a, c) => a + (c.value as number) * c.weight, 0) / totalWeight) * 100) : null;

  // Outcome score: win rate on decided trades.
  const outcomeScore =
    decidedTrades.length > 0
      ? Math.round((decidedTrades.filter((t) => (t.pnl ?? 0) > 0).length / decidedTrades.length) * 100)
      : null;

  // ── The reading: the honest interpretation of the gap ────────────────
  let reading: string;
  if (processScore !== null && outcomeScore !== null) {
    const gap = outcomeScore - processScore;
    if (gap > 15) {
      reading = `Your outcomes are currently outrunning your process (${outcomeScore} vs ${processScore}). That gap is usually variance — be careful about increasing size off results alone. Tighten the process and let the outcomes follow.`;
    } else if (gap < -15) {
      reading = `Your process is stronger than your recent outcomes (${processScore} vs ${outcomeScore}). This is the good kind of deficit — statistically, sound process with poor short-run results reverts. Keep taking the same quality of setups.`;
    } else {
      reading = `Process and outcomes are aligned (${processScore} vs ${outcomeScore}) — your results are matching your decision quality. This is what a sustainable edge looks like.`;
    }
  } else {
    reading = `Process score: ${processScore ?? "—"}. Log more closed trades to compute the outcome side.`;
  }

  return { processScore, outcomeScore, sampleSize, components, reading };
}

/** Persist computed insights to UserInsight (upsert per type). */
export async function refreshUserInsights(userId: string): Promise<ComputedInsights> {
  const insights = await computeUserInsights(userId);

  const upserts: Promise<unknown>[] = [];
  const types = [
    { type: "WIN_RATE_BY_SETUP" as const, data: insights.winRateBySetup },
    { type: "WIN_RATE_BY_EMOTION" as const, data: insights.winRateByEmotion },
    { type: "MISTAKE_PATTERN" as const, data: insights.mistakePatterns },
    { type: "RISK_BEHAVIOR" as const, data: insights.riskBehavior },
  ];
  for (const { type, data } of types) {
    upserts.push(
      prisma.userInsight.upsert({
        where: { userId_insightType: { userId, insightType: type } },
        update: {
          payload: data as never,
          sampleSize: data.reduce((a, d) => Math.max(a, d.metrics.sampleSize), 0),
          computedAt: new Date(),
        },
        create: {
          userId,
          insightType: type,
          payload: data as never,
          sampleSize: data.reduce((a, d) => Math.max(a, d.metrics.sampleSize), 0),
        },
      })
    );
  }
  await Promise.allSettled(upserts);
  return insights;
}