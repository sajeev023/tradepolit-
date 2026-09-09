"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DecisionBrief, type StateSnapshot } from "@/components/theses/DecisionBrief";
import { DecisionTimeline } from "@/components/theses/DecisionTimeline";
import { OutcomeReview } from "@/components/theses/OutcomeReview";
import { ClassifiedChangesPanel } from "@/components/theses/ClassifiedChangesPanel";
import { ContradictionPanel, AlternativeHypothesesPanel, InvalidationPanel } from "@/components/theses/AnalysisPanels";
import { StatusPill, DirectionBadge, RegimeTag, SetupQualityBadge } from "@/components/ui/decision-primitives";

export default function DecisionRecordPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [reviewOpen, setReviewOpen] = useState(false);

  // Fetch complete decision record
  const { data: thesis, isLoading, error } = useQuery<any>({
    queryKey: ["decision-record", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/theses/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load decision record");
      return body.data;
    },
  });

  // V4.1/V5: fetch live market context for the same symbol/timeframe so
  // What Changed compares the commitment-time snapshot to real current data.
  // depth=analysis returns the full V5 engine output (contradictions, hypotheses, classified changes).
  const symbol = thesis?.symbol;
  const timeframe = thesis?.timeframe;
  const { data: liveContext, isLoading: liveContextLoading } = useQuery<any>({
    queryKey: ["market-context", symbol, timeframe, "analysis", thesis?.bias],
    queryFn: async () => {
      const bias = thesis?.bias === "LONG" || thesis?.bias === "SHORT" ? thesis.bias : "NEUTRAL";
      const res = await fetch(`/api/v1/market/context?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}&depth=analysis&bias=${bias}`);
      const body = await res.json();
      // A 503/UPSTREAM_UNAVAILABLE is acceptable; we still want to render.
      if (!res.ok && body?.error?.code !== "UPSTREAM_UNAVAILABLE") {
        throw new Error(body.error?.message || "Failed to load market context");
      }
      return body.data || null;
    },
    enabled: !!symbol && !!timeframe,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/theses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete decision");
    },
    onSuccess: () => {
      toast.success("Decision removed");
      router.push("/theses");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <RefreshCw size={24} className="animate-spin text-[var(--color-accent-primary)] mb-3" />
        <span className="text-sm text-[var(--color-text-secondary)] font-mono">
          Reconstructing Decision Record...
        </span>
      </div>
    );
  }

  if (error || !thesis) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <AlertCircle size={32} className="mx-auto text-[var(--color-loss)]" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Decision Record Not Found
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          The requested decision record may have been removed or is unavailable.
        </p>
        <Link href="/theses" className="btn-secondary inline-flex items-center gap-2 text-xs">
          <ArrowLeft size={14} /> Back to Decisions
        </Link>
      </div>
    );
  }

  const isResolved = thesis.status !== "OPEN";
  const hasOutcome = !!thesis.outcome;
  const needsReview = isResolved && !hasOutcome;

  // V4.1: build the THEN state from the persisted snapshot when available.
  // Legacy theses without a snapshot fall back to the fields we have.
  const snapshot = thesis.contextSnapshot || {};
  const thenState: StateSnapshot = {
    price: Number(thesis.priceAtCreation || thesis.entryZone || 0),
    regime: thesis.regimeAtCreation || snapshot.marketContext?.regime,
    confidence: thesis.confidenceScore ?? thesis.confidence,
    rsi: snapshot.technicalContext?.rsi,
    atr: snapshot.technicalContext?.atr,
    support: snapshot.technicalContext?.support,
    resistance: snapshot.technicalContext?.resistance,
    mtfAlignment: snapshot.marketContext?.mtfAlignment,
    timestamp: thesis.createdAt,
  };

  // V4.1: build the NOW state from the live market context API.
  const nowState: StateSnapshot = liveContext
    ? {
        price: liveContext.technicalContext?.currentPrice,
        priceSource: liveContext.priceAtCapture?.source,
        regime: liveContext.marketContext?.regime,
        rsi: liveContext.technicalContext?.rsi,
        atr: liveContext.technicalContext?.atr,
        support: liveContext.technicalContext?.support,
        resistance: liveContext.technicalContext?.resistance,
        mtfAlignment: liveContext.marketContext?.mtfAlignment,
        confidence: liveContext.confidence?.tier,
        confidenceScore: liveContext.confidence?.score,
        timestamp: liveContext.capturedAt,
        freshness: liveContext.dataFreshness?.status,
        freshnessReason: liveContext.dataFreshness?.reason,
      }
    : {
        freshness: liveContextLoading ? "FRESH" : "UNAVAILABLE",
        freshnessReason: liveContextLoading ? "Loading current market data..." : "Current market data unavailable",
      };

  // V5: never fabricate a live price when context is unavailable.
  const livePrice =
    nowState.freshness === "UNAVAILABLE" && !liveContextLoading
      ? Number(thesis.priceAtCreation || thesis.entryZone || 0)
      : liveContext?.technicalContext?.currentPrice ?? Number(thesis.priceAtCreation || thesis.entryZone || 0);
  const currentDataUnavailable = nowState.freshness === "UNAVAILABLE" && !liveContextLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 select-none animate-fade-in">
      {/* ── Top Nav Bar ── */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <Link
          href="/theses"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors py-1 px-2 rounded hover:bg-[var(--color-bg-hover)]"
        >
          <ArrowLeft size={14} />
          <span>All Decisions</span>
        </Link>

        <div className="flex items-center gap-2">
          {needsReview && (
            <button
              onClick={() => setReviewOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: "var(--color-accent-primary)",
                color: "#05070B",
              }}
            >
              <ClipboardList size={14} />
              <span>Review Outcome & Attribution</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this decision record?")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg text-[var(--color-text-quaternary)] hover:text-[var(--color-loss)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            title="Delete decision record"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Signature Decision Record Banner ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(47,198,232,0.4), transparent)" }} />
        <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent-primary)] font-semibold">
                Signature Decision Record
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">·</span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                ID: {thesis.id.slice(0, 8)}
              </span>
              <StatusPill status={thesis.status} size="xs" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2 flex-wrap">
              <span>{thesis.symbol}</span>
              <DirectionBadge direction={thesis.bias} size="sm" />
              <span className="text-sm font-normal text-[var(--color-text-tertiary)] font-mono">
                {thesis.timeframe}
              </span>
            </h1>

            <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
              Committed on {new Date(thesis.createdAt).toLocaleString()} · Tracked with windowed extreme evaluation.
            </p>
          </div>

            <div className="flex items-center gap-3">
              <SetupQualityBadge quality={thesis.setupType} />
              <RegimeTag regime={thesis.regimeAtCreation} />
            </div>
          </div>

          {/* V4.1: data freshness banner */}
          {currentDataUnavailable && (
            <div className="mt-4 p-3 rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 flex items-start gap-2.5 text-xs">
              <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-warning)]">Current market data unavailable</span>
                <p className="text-[var(--color-text-secondary)] mt-0.5">
                  Your original decision record is preserved. The Then state shows what was known at commitment time.
                </p>
              </div>
            </div>
          )}
          {nowState.freshness === "STALE" && (
            <div className="mt-4 p-3 rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 flex items-center gap-2 text-xs text-[var(--color-warning)]">
              <Clock size={14} className="shrink-0" />
              <span>Data delayed · {nowState.freshnessReason}</span>
            </div>
          )}

        {/* Highlight Banner if outcome logged */}
        {hasOutcome && (
          <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-[var(--color-accent-primary)]" />
              <span className="text-[var(--color-text-secondary)]">
                Attribution:
              </span>
              <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                {thesis.outcome.attribution ? thesis.outcome.attribution.replace(/_/g, " ") : "Graded"}
              </span>
            </div>

            {thesis.outcome.whatILearned && (
              <div className="text-[11px] text-[var(--color-text-tertiary)] italic">
                &quot;{thesis.outcome.whatILearned}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main 2-Column Experience ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Decision Brief & What Changed */}
        <div id="what-changed-panel" className="lg:col-span-2 space-y-6">
          <DecisionBrief
            symbol={thesis.symbol}
            timeframe={thesis.timeframe}
            currentPrice={livePrice}
            bias={thesis.bias}
            setupQuality={thesis.setupType || "STANDARD"}
            confidence={thesis.confidence}
            confidenceScore={thesis.confidenceScore ?? 0}
            marketRegime={liveContext?.marketContext?.regime || thesis.regimeAtCreation || "TRENDING"}
            evidenceFor={thesis.evidenceFor || []}
            evidenceAgainst={thesis.evidenceAgainst || []}
            entryZone={thesis.entryZone}
            target={thesis.target}
            stopLoss={thesis.stopLoss}
            invalidation={thesis.invalidation}
            riskReward={thesis.riskReward}
            invalidationConditions={thesis.invalidationConditions}
            aiSummary={thesis.aiSummary}
            alternativeCase={
              liveContext?.marketContext?.regime !== thesis.regimeAtCreation
                ? `Market regime shifted from ${thesis.regimeAtCreation || "initial"} to ${liveContext?.marketContext?.regime || "current"}. The original thesis may need re-evaluation if the new regime invalidates its structure assumption.`
                : undefined
            }
            isCommitted={true}
            thenState={thenState}
            nowState={nowState}
            dataFreshness={nowState.freshness}
            dataFreshnessReason={nowState.freshnessReason}
            onChallengeDecision={() => {
              toast.info("Challenge: ask the AI why momentum or structure may contradict this thesis.");
            }}
            onExplainEvidence={(item) => {
              toast.info(`Evidence: ${item.slice(0, 80)}...`);
            }}
            onFindContradictions={() => {
              toast.info("Contradictions are surfaced in the Evidence section under Deep Evidence.");
            }}
            onWhatChanged={() => {
              document.getElementById("what-changed-panel")?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* V5: Classified What Changed */}
          <ClassifiedChangesPanel
            changes={liveContext?.changes || []}
            symbol={thesis.symbol}
          />

          {/* V5: Contradictions */}
          <ContradictionPanel contradictions={liveContext?.contradictions || []} />

          {/* V5: Alternative Hypotheses */}
          <AlternativeHypothesesPanel hypotheses={liveContext?.hypotheses || []} />

          {/* V5: Deterministic Invalidation */}
          <InvalidationPanel
            invalidation={liveContext?.invalidation || null}
            symbol={thesis.symbol}
          />
        </div>

        {/* Right Column (1 col): Chronological Lifecycle Timeline & Attribution */}
        <div className="space-y-6">
          <DecisionTimeline thesisData={thesis} />

          {/* Resolution Audit Box */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[var(--color-profit)]" />
                Resolution Audit
              </h3>
              <StatusPill status={thesis.status} size="xs" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)]">Resolved Price</span>
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                  {thesis.resolvedPrice ? `$${Number(thesis.resolvedPrice).toLocaleString()}` : "Awaiting Trigger"}
                </span>
              </div>

              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)]">Resolved Date</span>
                <span className="font-mono text-[var(--color-text-primary)]">
                  {thesis.resolvedAt ? new Date(thesis.resolvedAt).toLocaleDateString() : "—"}
                </span>
              </div>

              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)]">Regime at Resolution</span>
                <span className="font-mono text-[var(--color-text-primary)]">
                  {thesis.regimeAtResolution || thesis.regimeAtCreation || "—"}
                </span>
              </div>

              {hasOutcome && thesis.outcome?.rMultiple && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-text-tertiary)]">R Multiple</span>
                  <span className={`font-mono font-semibold ${Number(thesis.outcome.rMultiple) >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                    {thesis.outcome.rMultiple}
                  </span>
                </div>
              )}

              {hasOutcome && thesis.outcome?.attribution && (
                <div className="flex justify-between text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-text-tertiary)]">Attribution</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                    {thesis.outcome.attribution.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>

            {needsReview && (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="w-full mt-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-colors"
                style={{ backgroundColor: "var(--color-accent-primary)", color: "#05070B" }}
              >
                Log Outcome & Attribution
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Outcome Review Modal */}
      {reviewOpen && (
        <OutcomeReview
          thesisId={thesis.id}
          symbol={thesis.symbol}
          status={thesis.status}
          onDone={() => {
            setReviewOpen(false);
            queryClient.invalidateQueries({ queryKey: ["decision-record", id] });
          }}
        />
      )}
    </div>
  );
}
