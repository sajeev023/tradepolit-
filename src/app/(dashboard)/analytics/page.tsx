"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, RefreshCw, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Chip, EmptyState, Label, Panel, Skeleton, Stat } from "@/components/fd/primitives";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import type { PerformanceMetrics } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

/* ─── Ledger row ─── */
function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
      <span className="text-[13px] text-[var(--color-text-tertiary)]">{label}</span>
      <span className="font-mono text-[14px] font-medium tabular-nums" style={{ color: color || "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();

  const { data: performanceResponse, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-performance"],
    queryFn: async () => {
      const res = await fetch("/api/v1/performance");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load performance");
      return body.data;
    },
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/performance/recompute", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to recompute");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      toast.success("Performance metrics recomputed");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const metrics: PerformanceMetrics = performanceResponse?.metrics || {
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    expectancy: 0,
    averageRR: 0,
    averageWin: 0,
    averageLoss: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    bestAsset: null,
    worstAsset: null,
    longestWinStreak: 0,
    longestLoseStreak: 0,
    averageTradeDuration: 0,
    totalPnL: 0,
  };

  const equityCurveData = performanceResponse?.equityCurve || [];
  const isProfit = metrics.totalPnL >= 0;

  const Heading = ({ sub }: { sub: string }) => (
    <header>
      <Label>Analytics</Label>
      <h1 className="mt-2 text-[var(--color-text-primary)]">
        Your performance, <em className="text-[var(--accent)]">in numbers.</em>
      </h1>
      <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">{sub}</p>
    </header>
  );

  if (isError) {
    return (
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
        <Heading sub="We couldn't load your performance data." />
        <div className="card flex flex-col items-start gap-3 p-6">
          <Chip tone="loss" dot>Loading failed</Chip>
          <p className="text-[13px] text-[var(--color-text-secondary)]">{error instanceof Error ? error.message : "Unknown error"}</p>
          <button onClick={() => refetch()} className="btn-secondary btn-sm"><RefreshCw size={13} /> Retry</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-[360px] w-full" />
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" /></div>
      </div>
    );
  }

  if (metrics.totalTrades === 0) {
    return (
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
        <Heading sub="Aggregated metrics, equity progression and behavior summaries." />
        <div className="card p-8 sm:p-12">
          <EmptyState
            icon={<BarChart3 size={18} />}
            title="No trade history logged yet"
            body="Log and close at least one trade in your journal to render performance metrics and the equity curve."
            action={<Link href="/journal" className="btn-primary btn-sm">Log your first trade <ArrowUpRight size={14} /></Link>}
          />
        </div>
      </div>
    );
  }

  const peak = Math.max(...equityCurveData.map((d: any) => d.pnl), 0);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <Heading sub={`Computed from ${metrics.totalTrades} closed trades.`} />
        <button onClick={() => recomputeMutation.mutate()} disabled={recomputeMutation.isPending || isFetching} className="btn-secondary self-start md:self-auto">
          <RefreshCw size={14} className={recomputeMutation.isPending || isFetching ? "animate-spin" : ""} /> Recalculate
        </button>
      </div>

      {metrics.totalTrades < 5 && (
        <div role="note" className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: "rgba(var(--amber-rgb),0.3)", background: "var(--color-warning-bg)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
          <p className="text-[12.5px] leading-relaxed text-[var(--color-text-primary)]">
            <strong>Small sample.</strong> You have {metrics.totalTrades} closed {metrics.totalTrades === 1 ? "trade" : "trades"}. Around 15–20 are needed for a meaningful Sharpe ratio and expectancy.
          </p>
        </div>
      )}

      {/* Scorecard: hero P/L + ratios, then the curve */}
      <section className="card overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Stat size="lg" label="Net P/L · all time" value={`${isProfit ? "+" : "-"}$${Math.abs(metrics.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone={isProfit ? "gain" : "loss"} note={`Peak $${peak.toFixed(0)}`} />
          <div className="grid grid-cols-3 gap-6">
            <Stat label="Win rate" value={`${(metrics.winRate * 100).toFixed(1)}%`} tone={metrics.winRate >= 0.5 ? "gain" : "loss"} note={`${winsCount(metrics)}W · ${lossesCount(metrics)}L`} />
            <Stat label="Profit factor" value={metrics.profitFactor.toFixed(2)} tone={metrics.profitFactor >= 1 ? "gain" : "loss"} note="Gross win / loss" />
            <Stat label="Sharpe" value={metrics.sharpeRatio.toFixed(2)} tone={metrics.sharpeRatio >= 1 ? "gain" : "loss"} note="Risk-adjusted" />
          </div>
        </div>
        <div className="border-t px-2 pb-3 pt-4 sm:px-4" style={{ borderColor: "var(--hairline)" }}>
          <EquityCurveChart data={equityCurveData} height={280} strokeWidth={2.5} color={isProfit ? "var(--green)" : "var(--red)"} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <Panel label="Edge" title="Sizing & expectancy">
          <MetricRow label="Expectancy (per trade)" value={`${metrics.expectancy >= 0 ? "+" : "-"}$${Math.abs(metrics.expectancy).toFixed(2)}`} color={metrics.expectancy >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
          <MetricRow label="Average win" value={`$${metrics.averageWin.toFixed(2)}`} color="var(--color-profit)" />
          <MetricRow label="Average loss" value={`-$${metrics.averageLoss.toFixed(2)}`} color="var(--color-loss)" />
          <MetricRow label="Average R-multiple" value={`${metrics.averageRR.toFixed(2)}R`} color="var(--accent)" />
          <MetricRow label="Max drawdown" value={`-$${metrics.maxDrawdown.toFixed(2)}`} color="var(--color-loss)" />
        </Panel>

        <Panel label="Habits" title="Streaks & assets">
          <MetricRow label="Best traded asset" value={metrics.bestAsset || "—"} color="var(--accent)" />
          <MetricRow label="Worst traded asset" value={metrics.worstAsset || "—"} color="var(--color-loss)" />
          <MetricRow label="Longest win streak" value={`${metrics.longestWinStreak} wins`} color="var(--color-profit)" />
          <MetricRow label="Longest losing streak" value={`${metrics.longestLoseStreak} losses`} color="var(--color-loss)" />
          <MetricRow label="Avg trade duration" value={metrics.averageTradeDuration ? formatDuration(metrics.averageTradeDuration) : "—"} />
        </Panel>
      </div>
    </div>
  );
}

function winsCount(metrics: PerformanceMetrics): number {
  return Math.round(metrics.totalTrades * metrics.winRate);
}

function lossesCount(metrics: PerformanceMetrics): number {
  return metrics.totalTrades - winsCount(metrics);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}
