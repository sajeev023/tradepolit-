import { describe, expect, it } from "vitest";
import { buildEvidence, mergeAiEvidence } from "../evidence-builder";
import { proposeAttribution, ATTRIBUTION_LABELS } from "../attribution-engine";

const trendUpCtx = {
  regime: { regime: "TRENDING_UP", label: "Trending Up", reasons: ["Uptrend: price above rising EMAs."] },
  mtf: { alignment: "ALIGNED_BULLISH", score: 1, views: [] },
  confidenceInputs: { trendClarity: 0.8, momentumAlignment: 1, volatilityFit: 0.9, structureQuality: 0.8, dataQuality: 1, mtfAlignment: 1 },
} as never;

const mixedCtx = {
  regime: { regime: "RANGING", label: "Ranging", reasons: ["Price is range-bound."] },
  mtf: { alignment: "MIXED", score: 0.33, views: [] },
  confidenceInputs: { trendClarity: 0.2, momentumAlignment: 0.3, volatilityFit: 0.9, structureQuality: 0.5, dataQuality: 1, mtfAlignment: 0.33 },
} as never;

const bullTech = {
  rsi: 58, rsiLabel: "Bullish", macdValue: 120, macdSignal: 90, macdHistogram: 30,
  trend: "BULLISH", volumeSurgeRatio: 1.8, isVolatilitySpike: false,
};

describe("buildEvidence", () => {
  it("classifies trend agreement as evidence FOR a LONG thesis", () => {
    const ev = buildEvidence("LONG", trendUpCtx, bullTech);
    expect(ev.for.some((t) => t.includes("Trending Up"))).toBe(true);
    expect(ev.for.some((t) => t.includes("MACD bullish"))).toBe(true);
    expect(ev.for.some((t) => t.includes("Volume surge"))).toBe(true);
    expect(ev.against).toHaveLength(0);
  });

  it("classifies trend agreement as evidence AGAINST a SHORT thesis", () => {
    const ev = buildEvidence("SHORT", trendUpCtx, bullTech);
    expect(ev.against.some((t) => t.includes("Trending Up"))).toBe(true);
    expect(ev.against.some((t) => t.includes("MACD bullish"))).toBe(true);
    // Volume surge confirms THE MOVE (an uptrend) — correctly evidence
    // against a counter-trend short even though it's "positive" tape.
    expect(ev.against.some((t) => t.includes("Volume surge"))).toBe(true);
  });

  it("flags conflicts symmetrically for NEUTRAL reads", () => {
    const ev = buildEvidence(null, mixedCtx, { ...bullTech, rsi: 71, rsiLabel: "Overbought", liquiditySweep: true });
    // RANGING penalizes directional theses; liquidity sweep + overbought add risk evidence.
    expect(ev.against.some((t) => t.includes("Ranging"))).toBe(true);
    expect(ev.against.some((t) => t.includes("Liquidity sweep"))).toBe(true);
    expect(ev.against.some((t) => t.includes("overbought"))).toBe(true);
  });

  it("records thin-trend ambiguity as evidence AGAINST", () => {
    const ev = buildEvidence("LONG", mixedCtx, bullTech);
    expect(ev.against.some((t) => t.includes("ambiguous"))).toBe(true);
    expect(ev.against.some((t) => t.includes("higher timeframes disagree"))).toBe(true);
  });

  it("caps evidence length and merges AI evidence after deterministic", () => {
    const base = buildEvidence("LONG", trendUpCtx, bullTech);
    const merged = mergeAiEvidence(base, ["Order-flow imbalance at entry"], ["Macro CPI print pending"]);
    expect(merged.for[merged.for.length - 1]).toContain("AI: Order-flow imbalance");
    expect(merged.against.some((t) => t.includes("AI: Macro CPI"))).toBe(true);
    expect(merged.for.length).toBeLessThanOrEqual(15);
  });
});

describe("proposeAttribution", () => {
  const strongEvidence = { evidenceFor: ["a", "b", "c", "d"], evidenceAgainst: [] as string[] };
  const thinEvidence = { evidenceFor: ["a"], evidenceAgainst: [] as string[] };

  it("grades a strong-evidence win as GOOD_DECISION_GOOD_OUTCOME", () => {
    const p = proposeAttribution({
      thesisStatus: "HIT", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "Trending Up",
      ...strongEvidence, tookTrade: true, result: "WIN", followedPlan: true,
    });
    expect(p.label).toBe("GOOD_DECISION_GOOD_OUTCOME");
    expect(p.confidence).toBe("high");
  });

  it("grades a strong-evidence loss as GOOD_DECISION_BAD_OUTCOME (variance)", () => {
    const p = proposeAttribution({
      thesisStatus: "INVALIDATED", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "Trending Up",
      ...strongEvidence, tookTrade: true, result: "LOSS", followedPlan: true,
    });
    expect(p.label).toBe("GOOD_DECISION_BAD_OUTCOME");
  });

  it("grades a thin-evidence win as BAD_DECISION_GOOD_OUTCOME (luck)", () => {
    const p = proposeAttribution({
      thesisStatus: "HIT", bias: "LONG", regimeAtCreation: "Ranging", regimeAtResolution: "Ranging",
      ...thinEvidence, tookTrade: true, result: "WIN", followedPlan: true,
    });
    expect(p.label).toBe("BAD_DECISION_GOOD_OUTCOME");
    expect(p.reasoning).toContain("Luck");
  });

  it("prioritizes RISK_MANAGEMENT_ERROR when plan ignored AND oversized", () => {
    const p = proposeAttribution({
      thesisStatus: "INVALIDATED", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "Trending Up",
      ...strongEvidence, tookTrade: true, result: "LOSS", followedPlan: false, oversized: true,
    });
    expect(p.label).toBe("RISK_MANAGEMENT_ERROR");
    expect(p.confidence).toBe("high");
  });

  it("proposes BEHAVIORAL_ERROR when deviation came in a flagged emotional context", () => {
    const p = proposeAttribution({
      thesisStatus: "INVALIDATED", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "Trending Up",
      ...strongEvidence, tookTrade: true, result: "LOSS", followedPlan: false, behavioralFlag: true,
    });
    expect(p.label).toBe("BEHAVIORAL_ERROR");
  });

  it("proposes REGIME_SHIFT when market state changed between creation and resolution", () => {
    const p = proposeAttribution({
      thesisStatus: "INVALIDATED", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "High Volatility",
      ...strongEvidence, tookTrade: true, result: "LOSS", followedPlan: true,
    });
    expect(p.label).toBe("REGIME_SHIFT");
    expect(p.reasoning).toContain("changed character");
  });

  it("grades a plan-deviating WIN as BAD_DECISION_GOOD_OUTCOME — never reward indiscipline", () => {
    const p = proposeAttribution({
      thesisStatus: "HIT", bias: "LONG", regimeAtCreation: "Ranging", regimeAtResolution: "Ranging",
      ...thinEvidence, tookTrade: true, result: "WIN", followedPlan: false,
    });
    expect(p.label).toBe("BAD_DECISION_GOOD_OUTCOME");
    expect(p.reasoning).toContain("luck rewarding indiscipline");
  });

  it("grades non-traded confirmed theses on the reading, not P&L", () => {
    const p = proposeAttribution({
      thesisStatus: "HIT", bias: "LONG", regimeAtCreation: "Trending Up", regimeAtResolution: "Trending Up",
      ...strongEvidence, tookTrade: false, result: "NO_TRADE",
    });
    expect(p.label).toBe("GOOD_DECISION_GOOD_OUTCOME");
    expect(p.reasoning).toContain("observed rather than traded");
  });

  it("exposes a stable label catalog for the UI", () => {
    expect(ATTRIBUTION_LABELS).toHaveLength(10);
    for (const l of ATTRIBUTION_LABELS) {
      expect(l.label.length).toBeGreaterThan(3);
      expect(l.hint.length).toBeGreaterThan(5);
    }
  });
});