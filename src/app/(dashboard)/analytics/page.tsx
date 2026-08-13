"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  BarChart3,
  RefreshCw,
  Award,
  AlertTriangle,
  Target,
  Flame,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PerformanceMetrics } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

/* ─── Loading Skeletons ─── */
function StatSkeleton() {
  return (
    <div className="card p-5 flex flex-col justify-between min-h-[130px]">
      <div>
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-7 w-28" />
      </div>
      <div className="skeleton h-3 w-36 mt-3" />
    </div>
  );
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-xs"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p className="text-[10px] mb-1" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </p>
      <p className="font-mono font-bold text-sm" style={{ color: "var(--color-accent-primary)" }}>
        ${Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
}

/* ─── Metric Row ─── */
function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--color-border-subtle)" }}>
      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </span>
      <span className="font-mono font-bold text-sm" style={{ color: color || "var(--color-text-primary)" }}>
        {value}
      </span>
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

  // Render error state — show explicit error card instead of falling through
  // to zeroed metrics, which previously masked fetch failures from the user.
  if (isError) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div>
          <h1 className="tp-display-sm" style={{ color: "var(--color-text-primary)" }}>Performance Analytics</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            We couldn&apos;t load your performance data.
          </p>
        </div>
        <div className="card p-6 flex flex-col items-start gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Loading failed
          </span>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="animate-fade-in">
          <div className="skeleton h-7 w-52 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatSkeleton key={i} />)}
        </div>
        <div className="card p-5 min-h-[380px]">
          <div className="skeleton h-5 w-44 mb-4" />
          <div className="skeleton h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Render empty state
  if (metrics.totalTrades === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in">
        <div>
          <p className="tp-eyebrow mb-2">ANALYTICS · PERFORMANCE</p>
          <h1 className="tp-display-sm" style={{ color: "var(--color-text-primary)" }}>
            Performance Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Aggregated metrics, equity progression, and behavior summaries.
          </p>
        </div>

        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, var(--color-accent-primary-muted), var(--color-bg-tertiary))",
              border: "1px dashed var(--color-border-default)",
            }}
          >
            <BarChart3 size={22} style={{ color: "var(--color-accent-primary)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            No trade history logged yet
          </p>
          <p className="text-xs mt-1.5 max-w-sm" style={{ color: "var(--color-text-tertiary)" }}>
            Log and close at least one trade in your Trade Journal to render performance metrics and equity curves.
          </p>
          <Link href="/journal" className="btn-primary mt-6 text-xs">
            Log Your First Trade <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <p className="tp-eyebrow mb-2">ANALYTICS · PERFORMANCE</p>
          <h1 className="tp-display-sm" style={{ color: "var(--color-text-primary)" }}>
            Performance Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Metrics computed from {metrics.totalTrades} closed trade logs.
          </p>
        </div>

        <button
          onClick={() => recomputeMutation.mutate()}
          disabled={recomputeMutation.isPending || isFetching}
          className="btn-secondary text-xs"
        >
          <RefreshCw size={14} className={recomputeMutation.isPending || isFetching ? "animate-spin" : ""} />
          Recalculate Stats
        </button>
      </div>

      {/* Warning if under 5 trades */}
      {metrics.totalTrades < 5 && (
        <div className="p-3.5 rounded-lg flex items-center gap-3 border border-yellow-500/20 bg-yellow-500/5 animate-fade-in-delay-1">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <p className="text-xs leading-relaxed text-yellow-300">
            <strong>Sample Size Alert:</strong> You only have {metrics.totalTrades} closed trades. A minimum of 15-20 trades is recommended for statistically meaningful Sharpe ratio and expectancy metrics.
          </p>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Net P/L",
            value: `$${metrics.totalPnL.toFixed(2)}`,
            trend: isProfit,
            sub: "All time net profit",
            icon: <TrendingUp size={15} />,
          },
          {
            label: "Win Rate",
            value: `${(metrics.winRate * 100).toFixed(1)}%`,
            trend: metrics.winRate >= 0.5,
            sub: `${winsCount(metrics)} wins / ${lossesCount(metrics)} losses`,
            icon: <Target size={15} />,
          },
          {
            label: "Profit Factor",
            value: metrics.profitFactor.toFixed(2),
            trend: metrics.profitFactor >= 1.0,
            sub: "Gross Wins / Gross Losses",
            icon: <Award size={15} />,
          },
          {
            label: "Sharpe Ratio",
            value: metrics.sharpeRatio.toFixed(2),
            trend: metrics.sharpeRatio >= 1.0,
            sub: "Risk-adjusted performance",
            icon: <Flame size={15} />,
          },
        ].map((stat, idx) => (
          <div key={idx} className={`card p-5 flex flex-col justify-between min-h-[130px] animate-fade-in-delay-${idx + 1}`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: stat.trend ? "var(--color-profit-bg)" : "var(--color-loss-bg)",
                    color: stat.trend ? "var(--color-profit)" : "var(--color-loss)",
                  }}
                >
                  {stat.icon}
                </div>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                  {stat.label}
                </p>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: stat.trend ? "var(--color-profit)" : "var(--color-loss)" }}>
                {stat.value}
              </p>
            </div>
            <p className="text-[11px] mt-3" style={{ color: "var(--color-text-tertiary)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Equity Curve Panel */}
      <div className="card p-5 min-h-[380px] flex flex-col justify-between animate-fade-in-delay-3">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Cumulative Equity Curve
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                Visualize your P/L trajectory across all closed trades
              </p>
            </div>
            <span className="badge badge-info">
              Peak ${Math.max(...equityCurveData.map((d: any) => d.pnl), 0).toFixed(0)}
            </span>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAnalyticsPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent-primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="var(--color-accent-primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAnalyticsPnl)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics Sub-grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-delay-4">
        {/* Trade Sizing and Expectations */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-info-bg)", color: "var(--color-info)" }}>
              <BarChart3 size={14} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Trade Sizing & Expectations
            </h2>
          </div>
          <div>
            <MetricRow label="Expectancy (per trade)" value={`$${metrics.expectancy.toFixed(2)}`} color={metrics.expectancy >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
            <MetricRow label="Average Win" value={`$${metrics.averageWin.toFixed(2)}`} color="var(--color-profit)" />
            <MetricRow label="Average Loss" value={`-$${metrics.averageLoss.toFixed(2)}`} color="var(--color-loss)" />
            <MetricRow label="Average R-Multiple" value={`${metrics.averageRR.toFixed(2)}R`} color="var(--color-accent-primary)" />
            <MetricRow label="Max Drawdown" value={`-$${metrics.maxDrawdown.toFixed(2)}`} color="var(--color-loss)" />
          </div>
        </div>

        {/* Assets & Streaks */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning)" }}>
              <Clock size={14} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Streaks & Assets
            </h2>
          </div>
          <div>
            <MetricRow label="Best Traded Asset" value={metrics.bestAsset || "—"} color="var(--color-accent-primary)" />
            <MetricRow label="Worst Traded Asset" value={metrics.worstAsset || "—"} color="var(--color-loss)" />
            <MetricRow label="Longest Win Streak" value={`${metrics.longestWinStreak} wins`} color="var(--color-profit)" />
            <MetricRow label="Longest Lose Streak" value={`${metrics.longestLoseStreak} losses`} color="var(--color-loss)" />
            <MetricRow
              label="Avg Trade Duration"
              value={metrics.averageTradeDuration ? formatDuration(metrics.averageTradeDuration) : "—"}
            />
          </div>
        </div>
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
