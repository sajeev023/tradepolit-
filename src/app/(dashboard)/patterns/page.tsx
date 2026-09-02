"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert } from "lucide-react";

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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-400" />
        <h1 className="text-xl font-semibold text-white">Your Patterns</h1>
      </div>
      <p className="text-sm text-zinc-400 -mt-4">
        Computed from your journal and thesis outcomes — not AI guesses. Insights need at least 5 data points before
        they appear, so they earn your trust.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
          {error instanceof Error ? error.message : "Failed to load patterns"}
        </div>
      ) : data ? (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Closed trades" value={data.summary.closedTrades} />
            <Stat label="Thesis outcomes logged" value={data.summary.thesisOutcomes} />
            <Stat
              label="Thesis follow-through"
              value={data.summary.followRate !== null ? `${Math.round(data.summary.followRate * 100)}%` : "—"}
            />
            <Stat label="Insights" value={
              data.winRateBySetup.length + data.winRateByEmotion.length + data.mistakePatterns.length + data.riskBehavior.length
            } />
          </div>

          {data.decisionScore && <DecisionScoreCard score={data.decisionScore} />}

          {data.summary.closedTrades < 5 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
              <Sparkles className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-white font-medium">Not enough data yet</h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                Log at least 5 closed trades (or track theses to resolution) and your personal patterns will appear
                here. Every insight will show its sample size — we never overstate from thin data.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Section title="What works for you" icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} items={data.winRateBySetup} tone="emerald" />
              <Section title="Emotional state & results" icon={<TrendingDown className="h-4 w-4 text-red-400" />} items={data.winRateByEmotion} tone="red" />
              <Section title="Recurring mistakes" icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} items={data.mistakePatterns} tone="amber" />
              <Section title="Risk behavior" icon={<ShieldAlert className="h-4 w-4 text-orange-400" />} items={data.riskBehavior} tone="orange" />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-white mt-0.5">{value}</div>
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
  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/8 to-zinc-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Decision Score
        </h2>
        <span className="text-[10px] text-zinc-500">n={sampleSize} graded decisions</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Process</div>
          <div className={`text-3xl font-bold font-mono mt-1 ${processScore !== null ? "text-violet-300" : "text-zinc-600"}`}>
            {processScore !== null ? processScore : "—"}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">how well you decide</div>
        </div>
        <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Outcome</div>
          <div className={`text-3xl font-bold font-mono mt-1 ${outcomeScore !== null ? "text-white" : "text-zinc-600"}`}>
            {outcomeScore !== null ? outcomeScore : "—"}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">what results you got</div>
        </div>
      </div>

      {/* Component breakdown */}
      {components.length > 0 && (
        <div className="space-y-1.5">
          {components.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400 w-36 shrink-0">{c.name}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.value !== null ? "bg-violet-400/70" : ""}`}
                  style={{ width: c.value !== null ? `${Math.round(c.value * 100)}%` : "0%" }}
                />
              </div>
              <span className={`w-8 text-right font-mono ${c.value !== null ? "text-zinc-300" : "text-zinc-600"}`}>
                {c.value !== null ? Math.round(c.value * 100) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">{reading}</p>
      <p className="text-[10px] text-zinc-600">
        Process score: plan adherence (30%), process-sound attributions (30%), loop closure (20%), risk discipline (20%).
        Requires 3+ graded outcomes and 5+ closed trades.
      </p>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  red: "border-red-500/20 bg-red-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  orange: "border-orange-500/20 bg-orange-500/5",
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
      <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-500">
          Not enough data for this category yet.
        </div>
      ) : (
        items.map((item, i) => (
          <div key={i} className={`rounded-xl border p-4 ${TONES[tone]}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-white">{item.headline}</h3>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap pt-0.5">n={item.metrics.sampleSize}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{item.detail}</p>
          </div>
        ))
      )}
    </section>
  );
}