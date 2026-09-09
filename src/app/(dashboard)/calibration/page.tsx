"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Compass, 
  Sparkles, 
  Info, 
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { DecisionMetric } from "@/components/ui/decision-primitives";
import type { CalibrationSummary, CalibrationBucket } from "@/app/api/v1/calibration/route";

export default function CalibrationPage() {
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("ALL");
  const [showExplanation, setShowExplanation] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CalibrationSummary>({
    queryKey: ["calibration", selectedAssetClass],
    queryFn: async () => {
      const url = selectedAssetClass === "ALL" 
        ? "/api/v1/calibration" 
        : `/api/v1/calibration?assetClass=${encodeURIComponent(selectedAssetClass)}`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load calibration");
      return body.data;
    },
  });

  const totalResolved = data?.totalResolved ?? 0;
  const hasEnoughData = totalResolved >= 10;

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-md bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] flex items-center justify-center border border-[rgba(var(--accent-rgb),0.2)]">
              <Compass size={14} />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent-primary)] font-semibold">
              TradeCoPilot · Moat Feature
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Empirical Decision Calibration
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-2xl mt-1 leading-relaxed">
            Measures whether your stated confidence matches real market outcomes. A well-calibrated trader knows exactly what &quot;75% confidence&quot; means in practice.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg cursor-pointer"
          >
            <Sparkles size={13} className="text-[var(--color-accent-primary)]" />
            <span>{showExplanation ? "Hide Calibration Guide" : "Explain Calibration"}</span>
          </button>
        </div>
      </div>

      {/* Contextual AI Guide / Explanation Box */}
      {showExplanation && (
        <div className="p-4 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-secondary)] space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
            <Info size={14} className="text-[var(--color-accent-primary)]" />
            What is Decision Calibration?
          </div>
          <p className="leading-relaxed">
            In probabilistic trading, calibration answers: <span className="text-[var(--color-text-primary)] font-semibold">&quot;When the system asserts 75% confidence, does the market actually hit target 75% of the time?&quot;</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
            <div className="p-2.5 rounded bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-profit)] font-semibold block mb-1">Well Calibrated</span>
              Observed success rate closely matches predicted tier (+/- 8%). Your sizing can be trusted.
            </div>
            <div className="p-2.5 rounded bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-warning)] font-semibold block mb-1">Overconfident</span>
              High confidence theses underperform. The system or trader is asserting conviction without sufficient edge.
            </div>
            <div className="p-2.5 rounded bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-accent-primary)] font-semibold block mb-1">Underconfident</span>
              Low confidence theses outperform. You may be hesitating or discounting genuine edge.
            </div>
          </div>
        </div>
      )}

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 border-[var(--color-border-subtle)]">
          <DecisionMetric
            label="Total Graded Decisions"
            value={totalResolved}
            subtext="Resolved theses evaluated"
            mono
          />
        </div>

        <div className="card p-4 border-[var(--color-border-subtle)]">
          <DecisionMetric
            label="Outcomes Attributed"
            value={data?.totalWithOutcome ?? 0}
            subtext="Loop-closed reviews"
            mono
          />
        </div>

        <div className="card p-4 border-[var(--color-border-subtle)]">
          <DecisionMetric
            label="Calibration Status"
            value={
              hasEnoughData ? (
                <span className="text-[var(--color-profit)] font-mono text-sm">
                  {data?.overallCalibrationStatus?.replace(/_/g, " ") || "CALCULATING"}
                </span>
              ) : (
                <span className="text-[var(--color-text-tertiary)] font-mono text-sm">
                  COLLECTING DATA
                </span>
              )
            }
            subtext={hasEnoughData ? "Sufficient observations" : "Minimum 10 decisions required"}
          />
        </div>

        <div className="card p-4 border-[var(--color-border-subtle)]">
          <DecisionMetric
            label="Brier Reliability Score"
            value={data?.brierScore !== null ? data?.brierScore : "—"}
            subtext={data?.brierScore !== null ? "Lower is better (0.00 = perfect)" : "Awaiting 10 samples"}
            tone="accent"
            mono
          />
        </div>
      </div>

      {/* ── Main Calibration Visualizer ── */}
      {!hasEnoughData ? (
        <EmptyState
          icon={<Compass size={22} />}
          badge="Awaiting Empirical Threshold"
          title="Not enough observations yet"
          description={`Calibration requires at least 10 resolved decisions before asserting statistical validity. You currently have ${totalResolved} resolved decisions.`}
          reason="TradeCoPilot never fabricates statistics or asserts false precision on small sample sizes."
          actionLabel="Commit a Thesis on Charts"
          actionHref="/charts"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buckets Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5 border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-subtle)]">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Confidence Tier Calibration
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                    Predicted win rate vs actual observed outcomes per confidence tier
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {data?.buckets.map((b: CalibrationBucket) => {
                  const predPct = Math.round(b.predictedRate * 100);
                  const obsPct = b.observedRate !== null ? Math.round(b.observedRate * 100) : null;
                  const isSufficient = b.sampleSize >= 10;

                  return (
                    <div
                      key={b.tier}
                      className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                            {b.tier} CONFIDENCE
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">
                            (Predicted: {predPct}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                            N = {b.sampleSize}
                          </span>
                          <span
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                            style={{
                              color: isSufficient && b.status === "WELL_CALIBRATED" ? "var(--color-profit)" : "var(--color-warning)",
                              backgroundColor: "rgba(255, 255, 255, 0.04)",
                              borderColor: "var(--color-border-subtle)",
                            }}
                          >
                            {b.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {/* Visual calibration bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[var(--color-text-tertiary)]">
                            Observed: {obsPct !== null ? `${obsPct}%` : "—"} ({b.wins}W / {b.losses}L)
                          </span>
                          {b.confidenceInterval && (
                            <span className="text-[10px] text-[var(--color-text-quaternary)]">
                              95% CI: [{Math.round(b.confidenceInterval[0] * 100)}% – {Math.round(b.confidenceInterval[1] * 100)}%]
                            </span>
                          )}
                        </div>

                        {/* Comparative track */}
                        <div className="h-3 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden relative border border-[var(--color-border-subtle)]">
                          {/* Predicted benchmark marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-text-quaternary)] z-10"
                            style={{ left: `${predPct}%` }}
                            title={`Predicted Target: ${predPct}%`}
                          />
                          {/* Observed bar */}
                          {obsPct !== null && (
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, obsPct)}%`,
                                backgroundColor:
                                  b.status === "WELL_CALIBRATED"
                                    ? "var(--color-profit)"
                                    : "var(--color-accent-primary)",
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
                        {b.statusLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown Side Panel */}
          <div className="space-y-4">
            <div className="card p-5 border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Calibration by Regime
              </h3>
              <div className="space-y-2">
                {data?.breakdowns.byRegime.map((r: any) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] text-xs"
                  >
                    <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                      {r.name.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[var(--color-text-tertiary)]">n={r.sampleSize}</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {r.winRate !== null ? `${Math.round(r.winRate * 100)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5 border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Calibration by Asset Class
              </h3>
              <div className="space-y-2">
                {data?.breakdowns.byAssetClass.map((ac: any) => (
                  <div
                    key={ac.name}
                    className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] text-xs"
                  >
                    <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                      {ac.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[var(--color-text-tertiary)]">n={ac.sampleSize}</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {ac.winRate !== null ? `${Math.round(ac.winRate * 100)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
