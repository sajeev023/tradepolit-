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
  Compass,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DecisionBrief, type StateSnapshot } from "@/components/theses/DecisionBrief";
import { DecisionTimeline } from "@/components/theses/DecisionTimeline";
import { OutcomeReview } from "@/components/theses/OutcomeReview";
import { ClassifiedChangesPanel } from "@/components/theses/ClassifiedChangesPanel";
import { ContradictionPanel, AlternativeHypothesesPanel, InvalidationPanel } from "@/components/theses/AnalysisPanels";
import { StatusPill, DirectionBadge, RegimeTag, SetupQualityBadge } from "@/components/ui/decision-primitives";
import { PageShell, PageHeader, SectionCard } from "@/components/layout/page-shell";
import { AttentionBanner } from "@/components/layout/page-shell";

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
    <PageShell gap="md" className="pb-16 animate-fade-in">
      <PageHeader
        eyebrow="Decision Record"
        eyebrowIcon={<Compass size={14} />}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            {thesis.symbol}
            <DirectionBadge direction={thesis.bias} size="sm" />
            <span className="text-sm font-normal text-[var(--color-text-tertiary)] font-mono">{thesis.timeframe}</span>
          </span>
        }
        subtitle={`Committed on ${new Date(thesis.createdAt).toLocaleString()} · ID: ${thesis.id.slice(0, 8)}`}
        actions={
          <div className="flex items-center gap-2">
            {needsReview && (
              <button
                onClick={() => setReviewOpen(true)}
                className="btn-primary btn-sm"
              >
                <ClipboardList size={14} />
                <span>Review Outcome</span>
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this decision record?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="icon-button hover:text-[var(--color-loss)]"
              title="Delete decision record"
            >
              <Trash2 size={15} />
            </button>
          </div>
        }
      />

      <div className="app-shell__full space-y-4">
        {currentDataUnavailable && (
          <AttentionBanner
            severity="medium"
            title={<span className="flex items-center gap-2"><AlertTriangle size={14} /> Current market data unavailable</span>}
            description="Your original decision record is preserved. The Then state shows what was known at commitment time."
          />
        )}
        {nowState.freshness === "STALE" && (
          <AttentionBanner
            severity="low"
            title={<span className="flex items-center gap-2"><Clock size={14} /> Data delayed</span>}
            description={nowState.freshnessReason || "Live feed is behind schedule."}
          />
        )}
      </div>

      <div className="app-shell__main space-y-6">
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

        <div id="what-changed-panel" className="space-y-4 scroll-mt-6">
          <ClassifiedChangesPanel changes={liveContext?.changes || []} symbol={thesis.symbol} />
          <ContradictionPanel contradictions={liveContext?.contradictions || []} />
          <AlternativeHypothesesPanel hypotheses={liveContext?.hypotheses || []} />
          <InvalidationPanel invalidation={liveContext?.invalidation || null} symbol={thesis.symbol} />
        </div>
      </div>

      <div className="app-shell__side space-y-6">
        <DecisionTimeline thesisData={thesis} />

        <SectionCard
          title="Resolution Audit"
          titleIcon={<CheckCircle2 size={13} className="text-[var(--color-profit)]" />}
          headerActions={<StatusPill status={thesis.status} size="xs" />}
        >
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
            {hasOutcome && thesis.outcome?.whatILearned && (
              <div className="pt-2 border-t border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-tertiary)] italic">
                &quot;{thesis.outcome.whatILearned}&quot;
              </div>
            )}
          </div>

          {needsReview && (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="w-full mt-4 btn-primary btn-sm"
            >
              Log Outcome & Attribution
            </button>
          )}
        </SectionCard>
      </div>

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
    </PageShell>
  );
}
