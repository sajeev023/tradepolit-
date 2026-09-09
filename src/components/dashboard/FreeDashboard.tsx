"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Activity
} from "lucide-react";
import { StatusPill, DirectionBadge } from "@/components/ui/decision-primitives";

interface Thesis {
  id: string;
  symbol: string;
  timeframe: string;
  bias: "LONG" | "SHORT";
  status: "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED";
  riskReward: string | number;
  entryZone: string | number;
  target: string | number;
  invalidation: string | number;
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in select-none pb-12">
      {/* ── Header ── */}
      <div>
        <span className="tp-eyebrow text-[var(--color-accent-primary)]/80 mb-2 block">
          Financial Decision Intelligence · Free Workstation
        </span>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Decision Intelligence Center
        </h1>
        <p className="text-xs sm:text-sm mt-1 text-[var(--color-text-secondary)]">
          {openTheses.length > 0
            ? `${openTheses.length} active ${openTheses.length === 1 ? "decision is" : "decisions are"} being monitored against live windowed extremes.`
            : "Transform chart analyses into auditable decision records. The platform validates, monitors, and grades every commitment."}
        </p>
      </div>

      {/* ── Active Decisions Desk ── */}
      <div className="card p-5 space-y-3 border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[var(--color-accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Active Decisions Ledger
            </h2>
            {openTheses.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)]">
                {openTheses.length}
              </span>
            )}
          </div>
          <Link
            href="/theses"
            className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1 font-medium"
          >
            <span>All Decisions</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {thesesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent-primary)]" />
          </div>
        ) : openTheses.length === 0 ? (
          <div className="p-6 rounded-lg bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] text-center text-xs text-[var(--color-text-secondary)]">
            <p>No active trade decisions currently being monitored.</p>
            <Link
              href="/charts"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-accent-primary)] text-[#05070B]"
            >
              Analyze Chart &amp; Commit Thesis
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {openTheses.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/theses/${t.id}`}
                className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/50 hover:border-[var(--color-border-strong)] transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--color-text-primary)] font-mono">
                      {t.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] px-1 rounded bg-[var(--color-bg-secondary)]">
                      {t.timeframe}
                    </span>
                  </div>
                  <DirectionBadge direction={t.bias} size="xs" />
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono pt-1">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-tertiary)] block">Entry</span>
                    <span className="font-semibold text-[var(--color-text-secondary)]">${Number(t.entryZone).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-profit)] block">Target</span>
                    <span className="font-semibold text-[var(--color-profit)]">${Number(t.target).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-warning)] block">Invalid</span>
                    <span className="font-semibold text-[var(--color-warning)]">${Number(t.invalidation).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[10px] text-[var(--color-text-quaternary)]">
                  <span>R:R {Number(t.riskReward || 2).toFixed(1)}:1</span>
                  <span className="text-[var(--color-accent-primary)] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View Record <ArrowRight size={10} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending Outcome Reviews ── */}
      {needReview.length > 0 && (
        <div className="card p-4 border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-warning)]">
              <ClipboardList size={14} />
              <span>{needReview.length} Resolved Decision{needReview.length > 1 ? "s" : ""} Need Outcome Attribution</span>
            </div>
            <Link href="/theses?status=NEEDS_REVIEW" className="text-xs text-[var(--color-warning)] hover:underline font-mono">
              Review Now &rarr;
            </Link>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Closing the loop separates decision process from outcome variance and feeds your empirical calibration curve.
          </p>
        </div>
      )}

      {/* ── Personal Intelligence Insights Strip ── */}
      {topInsight && (
        <div className="card p-5 border-[var(--color-border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--color-accent-primary)]" />
              <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                Personal Decision Insight
              </h3>
            </div>
            <Link href="/patterns" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
              All Patterns <ArrowRight size={11} />
            </Link>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {topInsight.headline}
          </p>
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
            Based on n={topInsight.metrics.sampleSize} verified trade outcomes
          </span>
        </div>
      )}

      {/* ── Pro Upgrade Contextual Card ── */}
      <div className="card p-5 border-[rgba(47,198,232,0.25)] bg-[rgba(47,198,232,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={15} className="fill-[var(--color-accent-primary)] text-[var(--color-accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Unlock Full Financial Decision Intelligence OS
            </h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-lg leading-relaxed">
            Unlimited AI-assisted Decision Briefs, automatic high/low windowed monitoring, full calibration statistics, and proprietary attribution datasets.
          </p>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--color-accent-primary)] text-[#05070B] whitespace-nowrap text-center cursor-pointer"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}