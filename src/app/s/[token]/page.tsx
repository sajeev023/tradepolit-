import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrendingUp, TrendingDown, Target, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/format-price";
import { SharedCta } from "@/components/share/SharedCta";
import type { Metadata } from "next";

/**
 * PUBLIC SHARE PAGE — /s/[token]
 *
 * Renders a frozen, read-only thesis snapshot. This is the V2 growth
 * loop: every shared analysis carries a "analyze your own chart" CTA.
 *
 * Privacy: the snapshot is analysis-only (no PII, no journal, no trades)
 * — enforced at share-creation time in POST /api/v1/share.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade Thesis — TradCopilot",
  description: "A validated trade thesis tracked by TradCopilot.",
  robots: { index: false }, // shares are private-by-link
};

interface Snapshot {
  symbol: string;
  timeframe: string;
  bias: string;
  confidence: string;
  entryZone: number | string;
  stopLoss: number | string;
  invalidation: number | string;
  target: number | string;
  riskReward: number | string;
  regimeAtCreation: string | null;
  invalidationConditions: string | null;
  aiSummary: string;
  status: string;
  outcome: { result: string; followedPlan: boolean | null } | null;
  createdAt: string;
  resolvedAt: string | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Live — being monitored", className: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  HIT: { label: "Target hit", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  INVALIDATED: { label: "Invalidated", className: "bg-red-500/10 text-red-300 border-red-500/30" },
  EXPIRED: { label: "Expired", className: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
};

export default async function SharedThesisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shared = await prisma.sharedAnalysis.findUnique({
    where: { shareToken: token },
    include: { thesis: true },
  }).catch(() => null);

  if (!shared) notFound();

  // View counter (fire-and-forget; failures don't block render).
  void prisma.sharedAnalysis
    .update({ where: { id: shared.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const snap = shared.snapshot as unknown as Snapshot;
  const isLong = snap.bias === "LONG";
  const entry = num(snap.entryZone);
  const stop = num(snap.stopLoss);
  const target = num(snap.target);
  const rr = num(snap.riskReward);
  const status = STATUS_LABELS[snap.status] ?? STATUS_LABELS.OPEN;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isLong ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {isLong ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">{snap.symbol}</h1>
                <span className="text-xs text-zinc-500">{snap.timeframe}</span>
                <span className="text-xs font-semibold text-zinc-400">{snap.bias}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {new Date(snap.createdAt).toLocaleDateString()} · confidence {snap.confidence}
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Entry zone", value: entry, tone: "text-white" },
            { label: "Stop loss", value: stop, tone: "text-red-400" },
            { label: "Target", value: target, tone: "text-emerald-400" },
            { label: "Risk:Reward", value: rr !== null ? `${rr.toFixed(2)}:1` : null, tone: "text-white" },
          ].map((cell) => (
            <div key={cell.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="text-[11px] text-zinc-500">{cell.label}</div>
              <div className={`font-mono text-sm font-medium mt-1 ${cell.value !== null ? cell.tone : "text-zinc-600"}`}>
                {cell.value !== null ? (typeof cell.value === "number" ? formatPrice(snap.symbol, cell.value) : cell.value) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Invalidation */}
        {snap.invalidationConditions && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Invalidation
            </div>
            {snap.invalidationConditions}
          </div>
        )}

        {/* Summary */}
        {snap.aiSummary && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300 leading-relaxed">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
              <Target className="h-3.5 w-3.5" /> Thesis
            </div>
            {snap.aiSummary}
          </div>
        )}

        {snap.outcome && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-200">
            Outcome logged: <strong>{snap.outcome.result}</strong>
            {snap.outcome.followedPlan !== null && <> · {snap.outcome.followedPlan ? "followed the plan" : "deviated from the plan"}</>}
          </div>
        )}

        {/* Disclaimers */}
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          This is a historical analysis snapshot, not financial advice. Markets change — levels shown were captured when
          the thesis was created{snap.resolvedAt ? ` and resolved on ${new Date(snap.resolvedAt).toLocaleDateString()}` : ""}.
        </p>

        {/* Growth-loop CTA */}
        <SharedCta symbol={snap.symbol} />

        <div className="text-center text-xs text-zinc-600 pt-2">
          Shared via <Link href="/" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">TradCopilot</Link> —
          AI chart analysis with validated trade logic
        </div>
      </div>
    </div>
  );
}