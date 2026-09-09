"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, ArrowRight, Compass, Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfidenceVisualizer } from "@/components/theses/ConfidenceVisualizer";
import { PageShell, PageHeader, SectionCard, MetricCard } from "@/components/layout/page-shell";

/**
 * YOUR PATTERNS — V4 Personal Intelligence Laboratory.
 *
 * Deterministic insights computed from the user's own trades and thesis
 * outcomes. Every insight shows its sample size; under-powered claims
 * are suppressed at the engine level.
 */

interface InsightPayload {
  headline: string;
  detail: string;
  metrics: { sampleSize: number; winRate?: number; expectancyR?: number; netPnl?: number };
}

interface DecisionScore {
  processScore: number | null;
  outcomeScore: number | null;
  sampleSize: number;
  components: { name: string; value: number | null; weight: number; note: string }[];
  reading: string;
}

interface Insights {
  winRateBySetup: InsightPayload[];
  winRateByEmotion: InsightPayload[];
  mistakePatterns: InsightPayload[];
  riskBehavior: InsightPayload[];
  decisionScore: DecisionScore;
  summary: {
    closedTrades: number;
    thesisOutcomes: number;
    followRate: number | null;
    bestSetup: string | null;
    worstEmotion: string | null;
  };
}

export default function PatternsPage() {
  const { data, isLoading, error } = useQuery<Insights>({
    queryKey: ["insights"],
    queryFn: async () => {
      const res = await fetch("/api/v1/insights");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load patterns");
      return body.data;
    },
  });

  return (
    <PageShell gap="md" className="pb-12 animate-fade-in">
      <PageHeader
        eyebrow="Personal Intelligence Laboratory"
        eyebrowIcon={<Sparkles size={14} />}
        title="Your Patterns"
        subtitle="Deterministic insights from your own decisions and outcomes. Every claim shows its sample size — no fabricated intelligence."
        actions={
          <Link href="/theses" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1 font-medium">
            Decision History <ArrowRight size={11} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="app-shell__full flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-primary)] mb-2" />
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">Loading personal intelligence...</span>
        </div>
      ) : error ? (
        <div className="app-shell__full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-6 text-sm text-[var(--color-text-secondary)]">
          {error instanceof Error ? error.message : "Failed to load patterns"}
        </div>
      ) : data ? (
        <>
          <div className="app-shell__full grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Closed trades" value={data.summary.closedTrades} />
            <MetricCard label="Thesis outcomes" value={data.summary.thesisOutcomes} />
            <MetricCard
              label="Thesis follow-through"
              value={data.summary.followRate !== null ? `${Math.round(data.summary.followRate * 100)}%` : "—"}
            />
            <MetricCard
              label="Insights"
              value={data.winRateBySetup.length + data.winRateByEmotion.length + data.mistakePatterns.length + data.riskBehavior.length}
            />
          </div>

          <div className="app-shell__full">
            {data.decisionScore && <DecisionScoreCard score={data.decisionScore} />}
          </div>

          {data.summary.closedTrades < 5 ? (
            <div className="app-shell__full">
              <EmptyState
                icon={<Sparkles size={24} />}
                badge="DATA-BACKED INTELLIGENCE"
                title="Not enough empirical observations yet"
                description="Your personal patterns and DecisionScore are calculated deterministically from your closed trades and resolved theses. Every insight displays its exact sample size — we never fabricate or generalize from thin data."
                reason="Requires minimum 5 closed trades or resolved decisions to establish statistical significance."
                actionLabel="View Decision History"
                actionHref="/theses"
              />
            </div>
          ) : (
            <div className="app-shell__full grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Your Edge" icon={<TrendingUp className="h-4 w-4 text-[var(--color-profit)]" />} items={data.winRateBySetup} tone="profit" />
              <Section title="Emotional State & Results" icon={<TrendingDown className="h-4 w-4 text-[var(--color-loss)]" />} items={data.winRateByEmotion} tone="loss" />
              <Section title="Recurring Mistakes" icon={<AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />} items={data.mistakePatterns} tone="warning" />
              <Section title="Risk Behavior" icon={<ShieldAlert className="h-4 w-4 text-[var(--color-warning)]" />} items={data.riskBehavior} tone="warning" />
            </div>
          )}
        </>
      ) : null}
    </PageShell>
  );
}

function DecisionScoreCard({ score }: { score: DecisionScore }) {
  const { processScore, outcomeScore, sampleSize, components, reading } = score;
  const hasEnough = sampleSize >= 5;
  const gap = processScore !== null && outcomeScore !== null ? processScore - outcomeScore : null;

  return (
    <SectionCard
      title="Decision Score"
      titleIcon={<Compass size={16} className="text-[var(--color-accent-primary)]" />}
      headerActions={<span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">n={sampleSize} graded decisions</span>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Process</div>
          <div className={`text-3xl font-bold font-mono mt-1 ${processScore !== null ? "text-[var(--color-profit)]" : "text-[var(--color-text-quaternary)]"}`}>
            {processScore !== null ? processScore : "—"}
          </div>
          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">how well you decide</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Outcome</div>
          <div className={`text-3xl font-bold font-mono mt-1 ${outcomeScore !== null ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-quaternary)]"}`}>
            {outcomeScore !== null ? outcomeScore : "—"}
          </div>
          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">what results you got</div>
        </div>
      </div>

      {gap !== null && hasEnough && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40">
          <Activity size={14} className="text-[var(--color-accent-primary)]" />
          <span>
            {gap > 10
              ? "Your process is stronger than your recent outcomes — keep executing; variance often reverses."
              : gap < -10
              ? "Your outcomes exceed your process score — inspect whether luck or risk-taking is inflating results."
              : "Process and outcome are aligned. Your decisions are well-calibrated to results."}
          </span>
        </div>
      )}

      {components.length > 0 && (
        <div className="space-y-1.5">
          {components.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-[11px]">
              <span className="text-[var(--color-text-tertiary)] w-36 shrink-0">{c.name}</span>
              <div className="flex-1 h-1.5 bg-[var(--color-bg-deepest)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: c.value !== null ? `${Math.round(c.value * 100)}%` : "0%",
                    backgroundColor: c.value !== null ? "var(--color-accent-primary)" : "transparent",
                  }}
                />
              </div>
              <span className={`w-8 text-right font-mono ${c.value !== null ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-quaternary)]"}`}>
                {c.value !== null ? Math.round(c.value * 100) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">{reading}</p>
      <p className="text-[10px] text-[var(--color-text-quaternary)]">
        Process score: plan adherence (30%), process-sound attributions (30%), loop closure (20%), risk discipline (20%).
        Requires 3+ graded outcomes and 5+ closed trades.
      </p>
    </SectionCard>
  );
}

const TONES: Record<string, string> = {
  profit: "border-[var(--color-profit)]/20 bg-[var(--color-profit-bg)]/40",
  loss: "border-[var(--color-loss)]/20 bg-[var(--color-loss-bg)]/40",
  warning: "border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)]/40",
};

function Section({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: InsightPayload[];
  tone: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 text-xs text-[var(--color-text-tertiary)]">
          Not enough data for this category yet.
        </div>
      ) : (
        items.map((item, i) => (
          <div key={i} className={`rounded-xl border p-4 ${TONES[tone]}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{item.headline}</h3>
              <span className="text-[10px] text-[var(--color-text-quaternary)] whitespace-nowrap pt-0.5 font-mono">n={item.metrics.sampleSize}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">{item.detail}</p>
          </div>
        ))
      )}
    </section>
  );
}