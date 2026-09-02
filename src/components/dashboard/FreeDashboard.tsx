"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Target,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  ArrowRight,
  Loader2,
} from "lucide-react";

/**
 * FREE DASHBOARD (V2) — a real home for free users.
 *
 * Replaces the locked upsell wall. Content:
 *   1. Open theses being monitored — the "come back tomorrow" pull.
 *   2. Resolved-but-unreviewed theses — the loop-closing nudge.
 *   3. Personal patterns preview (deterministic insights).
 *   4. Quick actions: analyze, journal.
 *   5. Pro upgrade as a contextual card BELOW the value.
 */

interface Thesis {
  id: string;
  symbol: string;
  timeframe: string;
  bias: "LONG" | "SHORT";
  status: "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED";
  riskReward: string | number;
  createdAt: string;
  outcome: unknown | null;
}

interface Insights {
  winRateBySetup: { headline: string; metrics: { sampleSize: number } }[];
  mistakePatterns: { headline: string; metrics: { sampleSize: number } }[];
  riskBehavior: { headline: string; metrics: { sampleSize: number } }[];
  summary: { closedTrades: number; thesisOutcomes: number };
}

export function FreeDashboard() {
  const { data: theses, isLoading: thesesLoading } = useQuery<Thesis[]>({
    queryKey: ["theses", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/theses?status=ALL");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load theses");
      return body.data;
    },
  });

  const { data: insights } = useQuery<Insights>({
    queryKey: ["insights"],
    queryFn: async () => {
      const res = await fetch("/api/v1/insights");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
  });

  const openTheses = theses?.filter((t) => t.status === "OPEN") ?? [];
  const needReview = theses?.filter((t) => t.status !== "OPEN" && !t.outcome) ?? [];
  const topInsight =
    insights?.winRateBySetup?.[0] ?? insights?.mistakePatterns?.[0] ?? insights?.riskBehavior?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <span className="tp-eyebrow text-[var(--color-accent-primary)]/80 mb-2 block">Your Workstation</span>
        <h1 className="tp-display-sm tracking-tight text-[var(--color-text-primary)]">Today&apos;s trading picture</h1>
        <p className="text-sm mt-1.5 text-[var(--color-text-secondary)]">
          {openTheses.length > 0
            ? `${openTheses.length} open ${openTheses.length === 1 ? "thesis is" : "theses are"} being monitored — we&apos;ll tell you when they resolve.`
            : "Save an analysis as a thesis and TradeCopilot will monitor it for you."}
        </p>
      </div>

      {/* Open theses */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Target size={15} className="text-blue-400" />
            Open theses
          </h2>
          <Link href="/theses" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
            All theses <ArrowRight size={11} />
          </Link>
        </div>
        {thesesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-blue-400" /></div>
        ) : openTheses.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)] py-2">
            No open theses. Run an analysis on the charts page and tap <strong>Save as Thesis</strong> to start tracking.
          </p>
        ) : (
          <div className="space-y-2">
            {openTheses.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href="/theses"
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3 hover:border-[var(--color-accent-primary)]/40 transition-colors"
              >
                <span className={t.bias === "LONG" ? "text-emerald-400" : "text-red-400"}>
                  {t.bias === "LONG" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{t.symbol}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{t.timeframe}</span>
                <span className="ml-auto text-xs text-[var(--color-text-secondary)] font-mono">
                  R:R {Number(t.riskReward).toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Review nudge */}
      {needReview.length > 0 && (
        <Link
          href="/theses"
          className="card p-4 flex items-center gap-3 border-amber-500/30 hover:border-amber-500/50 transition-colors"
        >
          <ClipboardList size={16} className="text-amber-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {needReview.length} resolved {needReview.length === 1 ? "thesis needs" : "theses need"} a review
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Close the loop — log what happened so your patterns update.
            </div>
          </div>
          <ArrowRight size={14} className="text-amber-400" />
        </Link>
      )}

      {/* Patterns preview */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Sparkles size={15} className="text-violet-400" />
            Your patterns
          </h2>
          <Link href="/patterns" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
            Full breakdown <ArrowRight size={11} />
          </Link>
        </div>
        {topInsight ? (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="text-sm text-[var(--color-text-primary)]">{topInsight.headline}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1">n={topInsight.metrics.sampleSize} data points</div>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-secondary)] py-1">
            Log a few trades or thesis outcomes and your personal patterns appear here — computed from your own data.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/charts" className="card p-4 hover:border-[var(--color-accent-primary)]/40 transition-colors">
          <div className="text-sm font-medium text-[var(--color-text-primary)]">Analyze a chart</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">5 free AI analyses every day</div>
        </Link>
        <Link href="/journal" className="card p-4 hover:border-[var(--color-accent-primary)]/40 transition-colors">
          <div className="text-sm font-medium text-[var(--color-text-primary)]">Journal a trade</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">Your journal stays free forever</div>
        </Link>
      </div>

      {/* Contextual upgrade — below the value */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 shrink-0">
          <Zap size={18} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">Pro Terminal</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Equity curves, expectancy analytics, weekly AI reports, unlimited analyses and alerts.
          </div>
        </div>
        <Link href="/settings" className="btn-primary text-xs font-semibold py-2 px-4 whitespace-nowrap">
          $7.49/mo
        </Link>
      </div>
    </div>
  );
}

export default FreeDashboard;