"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  BookOpen,
  Activity,
  RefreshCw,
  Plus,
  Target,
  Award,
  Flame,
  Calendar,
  Clipboard,
  Check,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import { toast } from "sonner";

/* ─── Skeleton Components ─── */
function KPISkeleton() {
  return (
    <div className="card p-5 flex flex-col justify-between min-h-[130px] animate-pulse">
      <div>
        <div className="h-3 w-24 bg-[var(--color-bg-tertiary)] rounded mb-3" />
        <div className="h-8 w-32 bg-[var(--color-bg-tertiary)] rounded mb-2" />
      </div>
      <div className="h-3 w-40 bg-[var(--color-bg-tertiary)] rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-5 lg:col-span-2 min-h-[380px] flex flex-col animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded" />
        <div className="h-3 w-48 bg-[var(--color-bg-tertiary)] rounded" />
      </div>
      <div className="flex-1 flex items-end gap-1 px-4 pb-4">
        {[40, 55, 45, 65, 50, 70, 60, 75, 65, 80, 70, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--color-bg-tertiary)] rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      toast.success("Welcome to TradCopilot Pro! 🎉");
    }
  }, [searchParams]);

  // Fetch current user profile with subscription status
  const { data: profileData, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load profile");
      return body.data;
    },
  });

  // 1. Fetch Performance Summary from our new endpoint
  const { data: summaryResponse, isLoading: summaryLoading, isError: summaryIsError, refetch: refetchSummary } = useQuery({
    queryKey: ["dashboard-performance-summary"],
    queryFn: async () => {
      const res = await fetch("/api/v1/performance/summary");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load summary");
      return body.data;
    },
    enabled: profileData?.subscriptionStatus === "PRO_ACTIVE", // Only query if PRO
  });

  // 2. Generate Weekly AI Report Mutation
  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/ai/weekly-report", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to generate report");
      return body.data.report;
    },
    onSuccess: (data) => {
      setWeeklyReport(data);
      toast.success("AI Weekly Report generated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate weekly report");
    },
  });

  const handleCopyReport = () => {
    if (!weeklyReport) return;
    navigator.clipboard.writeText(weeklyReport);
    setCopied(true);
    toast.success("Weekly report copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = summaryResponse?.metrics || {
    totalTrades: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    avgRRAchieved: 0,
    bestSymbol: "—",
    bestSession: "—",
  };

  const equityCurveData = summaryResponse?.equityCurve || [];
  const recentTrades = summaryResponse?.recentTrades || [];
  const behavioralInsight = summaryResponse?.behavioralInsight || "No violations detected. Outstanding discipline!";
  const openPositionsCount = summaryResponse?.openPositionsCount || 0;

  const totalPnL = equityCurveData.length > 0 ? equityCurveData[equityCurveData.length - 1].pnl : 0;

  const kpiCards = [
    {
      label: "Net Realized P/L",
      value: totalPnL === 0 ? "—" : `$${totalPnL.toFixed(2)}`,
      sub: "Total cumulative profit/loss",
      icon: <TrendingUp size={16} />,
      isPnL: true,
      rawVal: totalPnL,
    },
    {
      label: "Win Rate",
      value: metrics.totalTrades === 0 ? "—" : `${metrics.winRate.toFixed(1)}%`,
      sub: metrics.totalTrades === 0 ? "No closed trades" : `${metrics.wins}W / ${metrics.losses}L breakdown`,
      icon: <Target size={16} />,
      isPnL: false,
    },
    {
      label: "Avg Achieved R:R",
      value: metrics.totalTrades === 0 ? "—" : `${metrics.avgRRAchieved.toFixed(2)}R`,
      sub: "Average reward-to-risk multiple",
      icon: <Award size={16} />,
      isPnL: false,
    },
    {
      label: "Open Positions",
      value: String(openPositionsCount),
      sub: "Active trades currently tracked",
      icon: <Activity size={16} />,
      isPnL: false,
    },
  ];

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <RefreshCw className="animate-spin text-[var(--color-accent-primary)] mb-2" size={24} />
        <span className="text-sm text-[var(--color-text-secondary)]">Loading profile details...</span>
      </div>
    );
  }

  if (profileData?.subscriptionStatus !== "PRO_ACTIVE") {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-12 animate-fade-in">
        <div className="card p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-6 max-w-xl mx-auto">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
            style={{ border: "1px solid rgba(var(--amber-rgb), 0.16)" }}
          >
            <Zap size={26} className="fill-[var(--color-warning)]" />
          </div>
          <div className="space-y-2.5">
            <span className="tp-eyebrow text-[var(--color-warning)] mb-1 block">Workstation · Locked</span>
            <h2 className="tp-display-sm tracking-tight text-[var(--color-text-primary)]">Pro Terminal</h2>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
              Visual analytics, win/loss distributions, cumulative equity curves, and automated weekly insights are Pro Terminal features. Your trades and journal stay free.
            </p>
          </div>
          <Link href="/settings" className="btn-primary text-xs font-semibold py-2.5 px-6 flex items-center gap-1.5">
            <Zap size={13} className="fill-[var(--background)] text-[var(--background)]" />
            Upgrade to Pro Terminal — $7.49/mo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <span className="tp-eyebrow text-[var(--color-accent-primary)]/80 mb-2 block">
            {metrics.totalTrades > 0 ? "Workstation · Performance" : "Workstation · Overview"}
          </span>
          <h1 className="tp-display-sm tracking-tight text-[var(--color-text-primary)]">
            {metrics.totalTrades > 0 ? "Workstation Dashboard" : "Welcome to TradCopilot"}
          </h1>
          <p className="text-sm mt-1.5 text-[var(--color-text-secondary)]">
            {metrics.totalTrades > 0
              ? `${metrics.totalTrades} closed trade${metrics.totalTrades !== 1 ? "s" : ""} analyzed · Real-time workstation pulse.`
              : "Ground control for your trading discipline. Start by logging your first trade."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/journal" className="btn-primary">
            <Plus size={16} /> Log a Trade
          </Link>
          <button
            onClick={() => refetchSummary()}
            className="btn-secondary flex items-center justify-center p-2 rounded-lg"
            title="Refresh summary data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI stats section */}
      {summaryIsError ? (
        <div className="card p-5 flex flex-col items-start gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-loss)]">
            Couldn&apos;t load metrics
          </span>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Your performance summary failed to load. Check your connection and retry.
          </p>
          <button
            onClick={() => refetchSummary()}
            style={{ borderColor: "rgba(var(--accent-rgb), 0.16)" }}
            className="px-3 py-1.5 rounded text-xs font-semibold border bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-muted)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((stat, idx) => {
            const isPos = stat.isPnL && stat.rawVal > 0;
            const isNeg = stat.isPnL && stat.rawVal < 0;
            let valColor = "var(--color-text-primary)";
            if (isPos) valColor = "var(--color-profit)";
            if (isNeg) valColor = "var(--color-loss)";

            return (
              <div
                key={idx}
                className={`card p-5 flex flex-col justify-between min-h-[130px] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors animate-fade-in-delay-${(idx % 6) + 1}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: "var(--color-accent-primary-subtle)",
                        color: "var(--color-accent-primary)",
                      }}
                    >
                      {stat.icon}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)]">
                      {stat.label}
                    </p>
                  </div>
                  <p className="text-2xl font-bold tp-mono mt-1" style={{ color: valColor }}>
                    {stat.value}
                  </p>
                </div>
                <p className="text-[11px] mt-3 text-[var(--color-text-tertiary)]">
                  {stat.sub}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Charts & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve Chart Card */}
        {summaryLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="card p-5 lg:col-span-2 flex flex-col justify-between min-h-[380px] border-[var(--color-border-subtle)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="tp-eyebrow text-[var(--color-text-quaternary)] mb-1 block">Equity Curve</span>
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Equity Performance Curve
                  </h2>
                  <p className="text-[10px] mt-0.5 text-[var(--color-text-tertiary)]">
                    Cumulative P/L performance across all closed trades
                  </p>
                </div>
                {equityCurveData.length > 0 && (
                  <span className="badge badge-info font-mono font-bold">
                    Peak ${Math.max(...equityCurveData.map((d: any) => d.pnl), 0).toFixed(0)}
                  </span>
                )}
              </div>

              {equityCurveData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border-default)]"
                  >
                    <BookOpen size={22} className="text-[var(--color-accent-primary)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    No performance data logged yet
                  </p>
                  <p className="text-xs mt-1.5 text-[var(--color-text-quaternary)] text-center max-w-xs">
                    Once you log closed trades, your cumulative equity curve will automatically render here.
                  </p>
                </div>
              ) : (
                <EquityCurveChart data={equityCurveData} height={240} />
              )}
            </div>
          </div>
        )}

        {/* Behavioral Insight & Performance insights */}
        <div className="flex flex-col gap-4">
          {/* Behavioral Insights Card */}
          <div className="card p-5 border-[var(--color-border-subtle)] flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-1.5">
                <Flame size={15} className="text-[var(--color-warning)]" /> Behavioral Pathology
              </h2>
              <div className="p-3.5 bg-[var(--color-bg-deepest)]/40 rounded-xl border border-[var(--color-border-subtle)] text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {behavioralInsight}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[var(--color-bg-tertiary)] p-2.5 rounded-lg border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-quaternary)] block">Best Session</span>
                <span className="font-bold text-[var(--color-accent-primary)] mt-1 block font-mono">{metrics.bestSession}</span>
              </div>
              <div className="bg-[var(--color-bg-tertiary)] p-2.5 rounded-lg border border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-quaternary)] block">Best Asset</span>
                <span className="font-bold text-[var(--color-accent-primary)] mt-1 block font-mono">{metrics.bestSymbol}</span>
              </div>
            </div>
          </div>

          {/* AI Weekly Report Trigger Card */}
          <div className="card p-5 border-[var(--color-border-subtle)] flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-1.5">
                <Clipboard size={15} className="text-[var(--color-accent-primary)]" /> Weekly Performance Report
              </h2>
              <p className="text-xs text-[var(--color-text-quaternary)] leading-relaxed mb-3">
                Aggregate trading performance, mistakes, and behavioral metrics for a comprehensive review.
              </p>
            </div>
            <button
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="w-full btn-primary text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
            >
              {reportMutation.isPending ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-[var(--color-accent-primary)]" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap size={13} className="text-[var(--color-warning)]" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Trades & AI Weekly Report view if generated */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades list */}
        <div className="card p-5 lg:col-span-2 border-[var(--color-border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-1.5">
            <Calendar size={15} className="text-[var(--color-accent-primary)]" /> Recent Closed Trades
          </h2>
          {recentTrades.length === 0 ? (
            <p className="text-xs text-[var(--color-text-quaternary)] py-4 text-center">No trades logged yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((t: any) => {
                const isWin = t.pnl > 0;
                return (
                  <div key={t.id} className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        t.direction === "LONG" ? "bg-[var(--color-profit-bg)] text-[var(--color-profit)]" : "bg-[var(--color-loss-bg)] text-[var(--color-loss)]"
                      }`}>
                        {t.direction}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[var(--color-text-primary)] block font-mono">{t.instrument}</span>
                        <span className="text-[10px] text-[var(--color-text-quaternary)] block">
                          {new Date(t.openedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-mono ${isWin ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                      {isWin ? "+" : ""}${t.pnl.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Report container (renders here once generated) */}
        <div className="flex flex-col">
          {weeklyReport && (
            <div
              className="card p-5 flex flex-col justify-between flex-1"
              style={{ borderColor: "rgba(var(--accent-rgb), 0.2)", background: "var(--color-accent-primary-subtle)" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--color-accent-primary)] flex items-center gap-1.5">
                    <Clipboard size={14} /> Weekly Performance Report
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyReport}
                      className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                      title="Copy report to clipboard"
                    >
                      {copied ? <Check size={14} className="text-[var(--color-profit)]" /> : <Clipboard size={14} />}
                    </button>
                    <button
                      onClick={() => setWeeklyReport(null)}
                      className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] overflow-y-auto max-h-[220px] whitespace-pre-wrap font-sans pr-1 custom-scrollbar">
                  {weeklyReport}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "rgba(var(--accent-rgb), 0.1)" }}>
                <p className="text-[10px] text-[var(--color-text-quaternary)]">Auto-saved to session logs</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-40">
        <RefreshCw className="animate-spin text-[var(--color-accent-primary)] mb-2" size={24} />
        <span className="text-sm text-[var(--color-text-secondary)] font-mono">LOADING WORKSTATION...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
