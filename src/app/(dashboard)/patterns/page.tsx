"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { EmptyState, Label, Skeleton, Stat } from "@/components/fd/primitives";

/**
 * YOUR PATTERNS — the personal-intelligence surface (V2).
 *
 * Deterministic insights computed from the user's own trades and thesis
 * outcomes. Every insight shows its sample size; under-powered claims
 * are suppressed at the engine level. This page is FREE — it is the
 * reason to come back, not a paywalled toy.
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
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Patterns</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          What the data says <em className="text-[var(--accent)]">about you.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Computed from your journal and thesis outcomes — not AI guesses. Insights need at least 5 data points before they appear, so they earn your trust.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="card p-6 text-[13px] text-[var(--color-text-tertiary)]">{error instanceof Error ? error.message : "Failed to load patterns"}</div>
      ) : data ? (
        <>
          <div className="card grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 md:grid-cols-4">
            <Stat size="lg" label="Closed trades" value={String(data.summary.closedTrades)} />
            <Stat size="lg" label="Outcomes logged" value={String(data.summary.thesisOutcomes)} />
            <Stat size="lg" label="Follow-through" value={data.summary.followRate !== null ? `${Math.round(data.summary.followRate * 100)}%` : "—"} tone="signal" />
            <Stat
              size="lg"
              label="Insights"
              value={String(data.winRateBySetup.length + data.winRateByEmotion.length + data.mistakePatterns.length + data.riskBehavior.length)}
            />
          </div>

          {data.decisionScore && <DecisionScoreCard score={data.decisionScore} />}

          {data.summary.closedTrades < 5 ? (
            <div className="card p-8 sm:p-12">
              <EmptyState
                icon={<Sparkles size={18} />}
                title="Not enough data yet"
                body="Log at least 5 closed trades (or track theses to resolution) and your personal patterns will appear here. Every insight shows its sample size — we never overstate from thin data."
                action={<Link href="/journal" className="btn-secondary btn-sm">Open journal</Link>}
              />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="What works for you" icon={<TrendingUp size={15} />} items={data.winRateBySetup} tone="var(--color-profit)" />
              <Section title="Emotional state & results" icon={<TrendingDown size={15} />} items={data.winRateByEmotion} tone="var(--color-loss)" />
              <Section title="Recurring mistakes" icon={<AlertTriangle size={15} />} items={data.mistakePatterns} tone="var(--color-warning)" />
              <Section title="Risk behavior" icon={<ShieldAlert size={15} />} items={data.riskBehavior} tone="var(--color-warning)" />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/**
 * V3 DECISION SCORE — "am I good or lucky?"
 * Process (how decisions are made) vs Outcome (what results happened),
 * deliberately separated, with the honest reading of the gap.
 */
function DecisionScoreCard({ score }: { score: DecisionScore }) {
  const { processScore, outcomeScore, sampleSize, components, reading } = score;
  const askCopilot = useUIStore((s) => s.askCopilot);
  return (
    <section className="card relative overflow-hidden" style={{ borderColor: "rgba(var(--accent-rgb),0.3)", background: "linear-gradient(180deg, rgba(var(--accent-rgb),0.05), var(--panel-1) 55%)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <Label>Decision score</Label>
          <h2 className="mt-1 font-serif text-[26px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">Good, or just lucky?</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">n={sampleSize} graded</span>
      </header>

      <div className="grid gap-px p-5 sm:p-6 md:grid-cols-2 md:gap-6">
        <Dial label="Process" note="how well you decide" value={processScore} tone="var(--accent)" />
        <Dial label="Outcome" note="what results you got" value={outcomeScore} tone="var(--color-text-primary)" />
      </div>

      {components.length > 0 && (
        <div className="space-y-3 border-t px-5 py-5 sm:px-6" style={{ borderColor: "var(--hairline)" }}>
          {components.map((c) => (
            <div key={c.name} className="grid grid-cols-[130px_1fr_32px] items-center gap-3 sm:grid-cols-[170px_1fr_36px]">
              <span className="truncate text-[12.5px] text-[var(--color-text-secondary)]" title={c.note}>{c.name}</span>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--panel-3)" }}>
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: c.value !== null ? `${Math.round(c.value * 100)}%` : "0%", background: "var(--accent)" }} />
              </div>
              <span className="text-right font-mono text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{c.value !== null ? Math.round(c.value * 100) : "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t px-5 py-5 sm:px-6" style={{ borderColor: "var(--hairline)" }}>
        <p className="border-l-2 pl-3.5 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]" style={{ borderColor: "var(--accent)" }}>{reading}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11px] leading-relaxed text-[var(--color-text-quaternary)]">
            Process score: plan adherence (30%), process-sound attributions (30%), loop closure (20%), risk discipline (20%). Requires 3+ graded outcomes and 5+ closed trades.
          </p>
          <button onClick={() => askCopilot("Explain my decision score and what I should work on first.")} className="btn-secondary btn-sm shrink-0">
            <Sparkles size={13} style={{ color: "var(--accent)" }} /> Ask Copilot why
          </button>
        </div>
      </div>
    </section>
  );
}

function Dial({ label, note, value, tone }: { label: string; note: string; value: number | null; tone: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }}>
      <Label>{label}</Label>
      <p className="mt-2 font-mono text-[56px] font-medium leading-none tabular-nums tracking-[-0.05em]" style={{ color: value !== null ? tone : "var(--color-text-quaternary)" }}>
        {value !== null ? value : "—"}
      </p>
      <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">{note}</p>
    </div>
  );
}

function Section({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: InsightPayload[]; tone: string }) {
  return (
    <section className="card min-w-0">
      <header className="flex items-center gap-2.5 border-b px-5 py-3.5" style={{ borderColor: "var(--hairline)", color: tone }}>
        {icon}
        <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="p-5 text-[12.5px] text-[var(--color-text-quaternary)]">Not enough data for this category yet.</p>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li key={i} className="border-b px-5 py-4 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-medium leading-snug text-[var(--color-text-primary)]">{item.headline}</h3>
                <span className="shrink-0 pt-0.5 font-mono text-[10px] text-[var(--color-text-quaternary)]">n={item.metrics.sampleSize}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
