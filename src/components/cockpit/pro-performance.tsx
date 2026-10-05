"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Clipboard, Flame, Loader2, RefreshCw, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import { Chip, EmptyState, Label, Panel, Skeleton, Stat } from "@/components/fd/primitives";

interface Metrics {
  totalTrades: number;
  winRate: number;
  wins: number;
  losses: number;
  avgRRAchieved: number;
  bestSymbol: string;
  bestSession: string;
}
interface RecentTrade {
  id: string;
  direction: "LONG" | "SHORT";
  instrument: string;
  openedAt: string;
  pnl: number;
}
export interface PerformanceSummary {
  metrics?: Metrics;
  equityCurve?: Array<{ pnl: number } & Record<string, unknown>>;
  recentTrades?: RecentTrade[];
  behavioralInsight?: string;
  openPositionsCount?: number;
}

const money = (n: number) => `${n < 0 ? "-" : n > 0 ? "+" : ""}$${Math.abs(n).toFixed(2)}`;

function WeeklyReport() {
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/ai/weekly-report", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to generate report");
      return body.data.report as string;
    },
    onSuccess: (r) => {
      setReport(r);
      toast.success("Weekly report ready");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate weekly report"),
  });

  const copy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel label="Weekly review" title="Your week, written up" className="h-full">
      {report ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-3 flex justify-end gap-1">
            <button onClick={copy} className="icon-button" aria-label="Copy report">
              {copied ? <Check size={14} className="text-[var(--color-profit)]" /> : <Clipboard size={14} />}
            </button>
            <button onClick={() => setReport(null)} className="icon-button" aria-label="Dismiss report"><X size={14} /></button>
          </div>
          <div className="custom-scrollbar max-h-[260px] overflow-y-auto whitespace-pre-wrap border-l-2 pl-3.5 text-[12.5px] leading-[1.7] text-[var(--color-text-secondary)]" style={{ borderColor: "var(--accent)" }} data-lenis-prevent>
            {report}
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">
            Copilot reads your trades, mistakes and behavior from the last seven days and writes you a review you can actually act on.
          </p>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Writing…</> : <><Zap size={14} /> Generate report</>}
          </button>
        </div>
      )}
    </Panel>
  );
}

export function ProPerformance({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: PerformanceSummary | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const m = summary?.metrics;
  const curve = summary?.equityCurve ?? [];
  const trades = summary?.recentTrades ?? [];
  const totalPnL = curve.length ? curve[curve.length - 1].pnl : 0;
  const hasTrades = (m?.totalTrades ?? 0) > 0;

  if (error) {
    return (
      <Panel label="Performance" title="Couldn't load your metrics">
        <p className="mb-3 text-[13px] text-[var(--color-text-tertiary)]">Your performance summary failed to load. Check your connection and retry.</p>
        <button onClick={onRetry} className="btn-secondary btn-sm"><RefreshCw size={13} /> Retry</button>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* KPI ribbon */}
      <section className="card grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : (
          <>
            <Stat size="lg" label="Net realized P/L" value={hasTrades ? money(totalPnL) : "—"} tone={totalPnL > 0 ? "gain" : totalPnL < 0 ? "loss" : "neutral"} note="Cumulative, closed trades" />
            <Stat size="lg" label="Win rate" value={hasTrades ? `${m!.winRate.toFixed(1)}%` : "—"} note={hasTrades ? `${m!.wins}W · ${m!.losses}L` : "No closed trades yet"} />
            <Stat size="lg" label="Avg R:R achieved" value={hasTrades ? `${m!.avgRRAchieved.toFixed(2)}R` : "—"} note="Reward per unit of risk" />
            <Stat size="lg" label="Open positions" value={String(summary?.openPositionsCount ?? 0)} note="Tracked in your journal" tone="signal" />
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        <Panel
          label="Equity"
          title="Realized P/L curve"
          right={curve.length > 0 ? <Chip tone="neutral">Peak ${Math.max(...curve.map((d) => d.pnl), 0).toFixed(0)}</Chip> : undefined}
        >
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : curve.length === 0 ? (
            <EmptyState icon={<Clipboard size={18} />} title="No closed trades yet" body="Your equity curve draws itself as soon as you log closed trades in the journal." action={<Link href="/journal" className="btn-secondary btn-sm">Open journal</Link>} />
          ) : (
            <EquityCurveChart data={curve} height={260} color={totalPnL >= 0 ? "var(--green)" : "var(--red)"} />
          )}
        </Panel>

        <Panel label="Behavior" title="Discipline check">
          <div className="flex gap-3 border-l-2 pl-3.5" style={{ borderColor: "var(--color-warning)" }}>
            <Flame size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
            <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{summary?.behavioralInsight ?? "Looking at your recent trades…"}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
            <Stat label="Best session" value={m?.bestSession ?? "—"} />
            <Stat label="Best asset" value={m?.bestSymbol ?? "—"} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        <Panel label="Journal" title="Recent closed trades" action={{ href: "/journal", text: "Journal" }} padded={false}>
          {trades.length === 0 ? (
            <p className="p-5 text-[13px] text-[var(--color-text-tertiary)]">No trades logged yet.</p>
          ) : (
            <ul className="mt-3">
              {trades.map((t) => (
                <li key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t px-5 py-3.5" style={{ borderColor: "var(--hairline)" }}>
                  <Chip tone={t.direction === "LONG" ? "gain" : "loss"}>{t.direction}</Chip>
                  <div className="min-w-0">
                    <p className="font-mono text-[13px] font-medium text-[var(--color-text-primary)]">{t.instrument}</p>
                    <Label>{new Date(t.openedAt).toLocaleDateString()}</Label>
                  </div>
                  <span className="font-mono text-[14px] font-medium tabular-nums" style={{ color: t.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}>{money(t.pnl)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <WeeklyReport />
      </div>
    </div>
  );
}
