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
  Compass,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import { FreeDashboard } from "@/components/dashboard/FreeDashboard";
import { DirectionBadge, StatusPill } from "@/components/ui/decision-primitives";
import { PageShell, PageHeader, MetricCard, SectionCard, AttentionBanner } from "@/components/layout/page-shell";
import { toast } from "sonner";

/* ─── Skeleton Components ─── */
function KPISkeleton() {
  return (
    <div className="card p-3.5 sm:p-5 flex flex-col justify-between min-h-[105px] sm:min-h-[130px] animate-pulse">
      <div>
        <div className="h-3 w-20 sm:w-24 bg-[var(--color-bg-tertiary)] rounded mb-2 sm:mb-3" />
        <div className="h-6 sm:h-8 w-24 sm:w-32 bg-[var(--color-bg-tertiary)] rounded mb-1.5 sm:mb-2" />
      </div>
      <div className="h-2.5 sm:h-3 w-28 sm:w-40 bg-[var(--color-bg-tertiary)] rounded" />
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

  // Fetch user theses for active decisions tracking
  const { data: thesesData } = useQuery<any[]>({
    queryKey: ["theses-dashboard-pro"],
    queryFn: async () => {
      const res = await fetch("/api/v1/theses?status=ALL");
      const body = await res.json();
      if (!res.ok) return [];
      return body.data || [];
    },
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
    // V2: FREE users get a REAL home — not a locked door. Their theses
    // and patterns are the reasons to return daily; the Pro upgrade is
    // a contextual card, not the whole page.
    return <FreeDashboard />;
  }

  return (
    <PageShell gap="md" className="animate-fade-in">
      <PageHeader
        eyebrow={metrics.totalTrades > 0 ? "Workstation · Performance" : "Workstation · Overview"}
        title={metrics.totalTrades > 0 ? "Workstation Dashboard" : "Welcome to TradCopilot"}
        subtitle={
          metrics.totalTrades > 0
            ? `${metrics.totalTrades} closed trade${metrics.totalTrades !== 1 ? "s" : ""} analyzed · Real-time workstation pulse.`
            : "Ground control for your trading discipline. Start by logging your first trade."
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/journal" className="btn-primary btn-sm">
              <Plus size={14} /> Log a Trade
            </Link>
            <button
              onClick={() => refetchSummary()}
              className="icon-button"
              title="Refresh summary data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* KPI stats section */}
      {summaryIsError ? (
        <div className="app-shell__full">
          <div className="card p-4 sm:p-5 flex flex-col items-start gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-loss)]">Couldn&apos;t load metrics</span>
            <p className="text-sm text-[var(--color-text-secondary)]">Your performance summary failed to load. Check your connection and retry.</p>
            <button
              onClick={() => refetchSummary()}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      ) : summaryLoading ? (
        <div className="app-shell__full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)}
        </div>
      ) : (
        <div className="app-shell__full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((stat, idx) => (
            <MetricCard
              key={idx}
              label={stat.label}
              value={stat.value}
              subtext={stat.sub}
              icon={stat.icon as React.ReactElement}
              tone={
                stat.isPnL
                  ? stat.rawVal > 0
                    ? "profit"
                    : stat.rawVal < 0
                    ? "loss"
                    : "default"
                  : "default"
              }
              className="animate-enter"
              style={{ animationDelay: `${idx * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {(() => {
        const openTheses = (thesesData || []).filter((t: any) => t.status === "OPEN");
        const needReviewTheses = (thesesData || []).filter((t: any) => t.status !== "OPEN" && !t.outcome);
        const resolvedTheses = (thesesData || []).filter((t: any) => t.status !== "OPEN" && !!t.outcome).slice(0, 3);

        return (
          <>
            <div className="app-shell__full space-y-4">
              {needReviewTheses.length > 0 && (
                <AttentionBanner
                  severity="medium"
                  title={
                    <span className="flex items-center gap-2">
                      <Clipboard size={14} />
                      Outcome Review Required
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">{needReviewTheses.length}</span>
                    </span>
                  }
                  description="Resolved decisions are waiting for outcome attribution. Closing the loop feeds your calibration and DecisionScore."
                  action={
                    <Link href="/theses?status=NEEDS_REVIEW" className="btn-primary btn-sm">
                      <Clipboard size={13} /> Review Now
                    </Link>
                  }
                />
              )}
            </div>

            <div className="app-shell__main space-y-4">
              {openTheses.length > 0 && (
                <SectionCard
                  title="Active Decisions"
                  titleIcon={<Compass size={14} />}
                  headerActions={
                    <>
                      <span className="badge badge-info">{openTheses.length}</span>
                      <Link href="/theses?status=OPEN" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1 font-medium">
                        View All <ArrowRight size={11} />
                      </Link>
                    </>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {openTheses.slice(0, 4).map((t: any) => (
                      <Link
                        key={t.id}
                        href={`/theses/${t.id}`}
                        className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)] transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--color-text-primary)] font-mono">
                            <span>{t.symbol}</span>
                            <span className="text-[10px] font-normal text-[var(--color-text-tertiary)] px-1 rounded bg-[var(--color-bg-secondary)]">{t.timeframe}</span>
                          </div>
                          <DirectionBadge direction={t.bias} size="xs" />
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                          <div>
                            <span className="text-[var(--color-text-tertiary)] block">Entry</span>
                            <span className="text-[var(--color-text-secondary)] font-semibold">${Number(t.entryZone).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[var(--color-profit)] block">Target</span>
                            <span className="text-[var(--color-profit)] font-semibold">${Number(t.target).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[var(--color-warning)] block">Invalid</span>
                            <span className="text-[var(--color-warning)] font-semibold">${Number(t.invalidation).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[10px] text-[var(--color-text-quaternary)]">
                          <span>R:R {Number(t.riskReward || 2).toFixed(1)}:1</span>
                          <span className="text-[var(--color-accent-primary)] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Record <ArrowRight size={10} />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            <div className="app-shell__side space-y-4">
              <SectionCard title="Decision Health" titleIcon={<Activity size={13} />}>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">Created this week</span>
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                      {(thesesData || []).filter((t: any) => {
                        const d = new Date(t.createdAt);
                        const now = new Date();
                        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                        return diff <= 7;
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">Closure rate</span>
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                      {(() => {
                        const total = (thesesData || []).length;
                        if (!total) return "—";
                        const closed = total - openTheses.length;
                        return `${Math.round((closed / total) * 100)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">Review backlog</span>
                    <span className={`font-mono font-semibold ${needReviewTheses.length ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]"}`}>
                      {needReviewTheses.length}
                    </span>
                  </div>
                </div>
              </SectionCard>

              {resolvedTheses.length > 0 && (
                <SectionCard title="Recent Outcomes" titleIcon={<Award size={13} />}>
                  <div className="space-y-2">
                    {resolvedTheses.map((t: any) => (
                      <Link
                        key={t.id}
                        href={`/theses/${t.id}`}
                        className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-colors group"
                      >
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-semibold text-[var(--color-text-primary)]">{t.symbol}</span>
                          <span className="text-[10px] text-[var(--color-text-tertiary)]">{t.bias}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-semibold ${t.status === "HIT" ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                            {t.status}
                          </span>
                          <ArrowRight size={11} className="text-[var(--color-text-quaternary)] group-hover:text-[var(--color-accent-primary)] transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          </>
        );
      })()}

      <div className="app-shell__main">
        {summaryLoading ? (
          <ChartSkeleton />
        ) : (
          <SectionCard
            title="Equity Curve"
            titleIcon={<TrendingUp size={14} />}
            headerActions={
              equityCurveData.length > 0 && (
                <span className="badge badge-info">
                  Peak ${Math.max(...equityCurveData.map((d: any) => d.pnl), 0).toFixed(0)}
                </span>
              )
            }
            footer={<span className="font-mono">Performance · Closed trades</span>}
          >
            {equityCurveData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[240px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border-default)]">
                  <BookOpen size={22} className="text-[var(--color-accent-primary)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">No performance data yet</p>
                <p className="text-xs mt-1 text-[var(--color-text-quaternary)] max-w-xs">Log trades in your journal to build your equity curve.</p>
              </div>
            ) : (
              <EquityCurveChart data={equityCurveData} height={240} />
            )}
          </SectionCard>
        )}
      </div>

      <div className="app-shell__side space-y-4">
        <SectionCard title="Behavioral Insight" titleIcon={<Flame size={13} className="text-[var(--color-warning)]" />}>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{behavioralInsight}</p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] text-center">
              <span className="text-[10px] text-[var(--color-text-quaternary)] block">Best Session</span>
              <span className="text-xs font-bold text-[var(--color-accent-primary)] font-mono">{metrics.bestSession}</span>
            </div>
            <div className="p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] text-center">
              <span className="text-[10px] text-[var(--color-text-quaternary)] block">Best Asset</span>
              <span className="text-xs font-bold text-[var(--color-accent-primary)] font-mono">{metrics.bestSymbol}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Weekly Report" titleIcon={<Clipboard size={13} />}>
          <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
            Generate an AI-assisted weekly review of your closed trades, behavioral metrics, and process gaps.
          </p>
          <button
            onClick={() => reportMutation.mutate()}
            disabled={reportMutation.isPending}
            className="w-full mt-3 btn-primary btn-sm"
          >
            {reportMutation.isPending ? (
              <><RefreshCw size={13} className="animate-spin" /> Generating...</>
            ) : (
              <><Zap size={13} className="text-[var(--color-warning)]" /> Generate Report</>
            )}
          </button>
        </SectionCard>
      </div>

      <div className="app-shell__main">
        <SectionCard
          title="Recent Closed Trades"
          titleIcon={<Calendar size={14} />}
          headerActions={<Link href="/journal" className="text-xs text-[var(--color-accent-primary)] hover:underline font-medium">Journal &rarr;</Link>}
        >
          {recentTrades.length === 0 ? (
            <p className="text-xs text-[var(--color-text-quaternary)] py-4 text-center">No trades logged yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((t: any) => {
                const isWin = t.pnl > 0;
                return (
                  <Link
                    key={t.id}
                    href={`/journal?trade=${t.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${t.direction === "LONG" ? "bg-[var(--color-profit-bg)] text-[var(--color-profit)]" : "bg-[var(--color-loss-bg)] text-[var(--color-loss)]"}`}>
                        {t.direction}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[var(--color-text-primary)] block font-mono">{t.instrument}</span>
                        <span className="text-[10px] text-[var(--color-text-quaternary)] block">{new Date(t.openedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-mono ${isWin ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                      {isWin ? "+" : ""}${t.pnl.toFixed(2)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="app-shell__side">
        {weeklyReport && (
          <div
            className="rounded-xl border p-5 flex flex-col justify-between flex-1"
            style={{ borderColor: "rgba(var(--accent-rgb), 0.2)", background: "var(--color-accent-primary-subtle)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--color-accent-primary)] flex items-center gap-1.5">
                <Clipboard size={14} /> Weekly Performance Report
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyReport}
                  className="icon-button"
                  title="Copy report to clipboard"
                >
                  {copied ? <Check size={14} className="text-[var(--color-profit)]" /> : <Clipboard size={14} />}
                </button>
                <button onClick={() => setWeeklyReport(null)} className="icon-button">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="text-[11px] leading-relaxed text-[var(--color-text-secondary)] overflow-y-auto max-h-[220px] whitespace-pre-wrap font-sans pr-1 custom-scrollbar">
              {weeklyReport}
            </div>
            <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "rgba(var(--accent-rgb), 0.1)" }}>
              <p className="text-[10px] text-[var(--color-text-quaternary)]">Auto-saved to session logs</p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
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
