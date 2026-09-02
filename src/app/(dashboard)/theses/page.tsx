"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Trash2,
  ClipboardList,
  Share2,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format-price";
import { OutcomeReview } from "@/components/theses/OutcomeReview";

/**
 * THESES — the V2 retention core.
 *
 * Every analysis can become a tracked thesis: bias, entry, stop,
 * invalidation, target, R:R — validated by the trade-logic engine before
 * persistence, monitored against live prices, resolved to HIT /
 * INVALIDATED / EXPIRED, and closed with an outcome review that feeds
 * the personal-insight layer.
 *
 * UI conventions follow the journal page: dark cards, lucide icons,
 * react-query mutations with toast feedback.
 */

interface Thesis {
  id: string;
  symbol: string;
  timeframe: string;
  bias: "LONG" | "SHORT";
  confidence: string;
  entryZone: string | number;
  stopLoss: string | number;
  invalidation: string | number;
  target: string | number;
  riskReward: string | number;
  regimeAtCreation: string | null;
  invalidationConditions: string | null;
  aiSummary: string;
  status: "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED";
  resolvedPrice: string | number | null;
  createdAt: string;
  outcome: ThesisOutcome | null;
}

interface ThesisOutcome {
  id: string;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "NO_TRADE";
  tookTrade: boolean;
  rMultiple: string | number | null;
  followedPlan: boolean | null;
  whatILearned: string | null;
}

type StatusFilter = "ALL" | "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED";

const STATUS_STYLES: Record<Thesis["status"], { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  HIT: { label: "Target Hit", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  INVALIDATED: { label: "Invalidated", className: "bg-red-500/10 text-red-400 border-red-500/30" },
  EXPIRED: { label: "Expired", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
};

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export default function ThesesPage() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: theses, isLoading } = useQuery<Thesis[]>({
    queryKey: ["theses", filter],
    queryFn: async () => {
      const res = await fetch(`/api/v1/theses?status=${filter}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load theses");
      return body.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/theses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete thesis");
    },
    onSuccess: () => {
      toast.success("Thesis deleted");
      queryClient.invalidateQueries({ queryKey: ["theses"] });
    },
    onError: () => toast.error("Failed to delete thesis"),
  });

  const openCount = theses?.filter((t) => t.status === "OPEN").length ?? 0;
  const resolvedNoOutcome = theses?.filter((t) => t.status !== "OPEN" && !t.outcome).length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">Theses</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Your tracked trade theses. Save one from any analysis — TradeCopilot monitors it against live prices and tells you when it resolves.
        </p>
        {(openCount > 0 || resolvedNoOutcome > 0) && (
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {openCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                {openCount} open {openCount === 1 ? "thesis" : "theses"} being monitored
              </span>
            )}
            {resolvedNoOutcome > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {resolvedNoOutcome} resolved {resolvedNoOutcome === 1 ? "thesis needs" : "theses need"} an outcome review
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "OPEN", "HIT", "INVALIDATED", "EXPIRED"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            {f === "ALL" ? "All" : STATUS_STYLES[f].label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      ) : !theses || theses.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <Target className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-white font-medium">No theses yet</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            Run an analysis on a chart, then tap <strong className="text-zinc-200">Save as Thesis</strong> to start tracking.
            TradeCopilot will watch it and close the loop when it resolves.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {theses.map((thesis) => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              expanded={expandedId === thesis.id}
              onToggle={() => setExpandedId(expandedId === thesis.id ? null : thesis.id)}
              onDelete={() => deleteMutation.mutate(thesis.id)}
              onReview={() => setReviewId(thesis.id)}
            />
          ))}
        </div>
      )}

      {reviewId &&
        (() => {
          const thesis = theses?.find((t) => t.id === reviewId);
          if (!thesis || thesis.status === "OPEN") return null;
          return (
            <OutcomeReview
              thesisId={thesis.id}
              symbol={thesis.symbol}
              status={thesis.status}
              onDone={() => setReviewId(null)}
            />
          );
        })()}
    </div>
  );
}

function ThesisCard({
  thesis,
  expanded,
  onToggle,
  onDelete,
  onReview,
}: {
  thesis: Thesis;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReview: () => void;
}) {
  const isLong = thesis.bias === "LONG";
  const entry = num(thesis.entryZone);
  const stop = num(thesis.stopLoss);
  const target = num(thesis.target);
  const rr = num(thesis.riskReward);
  const status = STATUS_STYLES[thesis.status];
  const [sharing, setSharing] = useState(false);
  const router = useRouter();

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/v1/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesisId: thesis.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to share");
      const url = `${window.location.origin}${body.data.url}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied to clipboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to share");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Row header */}
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isLong ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
          {isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{thesis.symbol}</span>
            <span className="text-zinc-500 text-xs">{thesis.timeframe}</span>
            <span className={`text-xs font-medium ${isLong ? "text-emerald-400" : "text-red-400"}`}>{isLong ? "LONG" : "SHORT"}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${status.className}`}>{status.label}</span>
            {thesis.outcome && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 text-[11px]">
                Outcome logged
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {entry !== null && <>Entry {formatPrice(thesis.symbol, entry)} · </>}
            {rr !== null && <>R:R {rr.toFixed(2)}:1 · </>}
            {new Date(thesis.createdAt).toLocaleDateString()}
            {thesis.regimeAtCreation && <> · {thesis.regimeAtCreation}</>}
          </div>
        </div>
        <div className="text-zinc-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Level label="Entry zone" value={entry} symbol={thesis.symbol} />
            <Level label="Stop loss" value={stop} tone="red" symbol={thesis.symbol} />
            <Level label="Invalidation" value={num(thesis.invalidation)} tone="red" symbol={thesis.symbol} />
            <Level label="Target" value={target} tone="green" symbol={thesis.symbol} />
          </div>

          {thesis.invalidationConditions && (
            <div className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-3 border border-zinc-800">
              <span className="text-zinc-500">Invalidation: </span>
              {thesis.invalidationConditions}
            </div>
          )}

          {thesis.aiSummary && (
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-6">{thesis.aiSummary}</p>
          )}

          {thesis.outcome ? (
            <div className="text-xs bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 space-y-1">
              <div className="text-violet-300 font-medium">
                Outcome: {thesis.outcome.result} {thesis.outcome.tookTrade ? "· traded" : "· observed"}
                {thesis.outcome.rMultiple !== null && <> · {num(thesis.outcome.rMultiple)?.toFixed(2)}R</>}
              </div>
              {thesis.outcome.whatILearned && <div className="text-zinc-400">{thesis.outcome.whatILearned}</div>}
            </div>
          ) : (
            thesis.status !== "OPEN" && (
              <button
                onClick={onReview}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/20 transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Review outcome — close the loop
              </button>
            )
          )}

          {/* Journal handoff — the analysis→trade-log bridge (previously
              built but never linked). */}
          <button
            onClick={() => {
              const params = new URLSearchParams({
                prefill: "true",
                instrument: thesis.symbol,
                direction: thesis.bias,
                entryPrice: String(num(thesis.entryZone) ?? ""),
                stopLoss: String(num(thesis.stopLoss) ?? ""),
                takeProfit: String(num(thesis.target) ?? ""),
              });
              router.push(`/journal?${params.toString()}`);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700 text-xs font-medium hover:bg-zinc-700/60 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Log this trade in journal
          </button>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 text-xs transition-colors disabled:opacity-50"
            >
              {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} Share
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Level({ label, value, tone, symbol }: { label: string; value: number | null; tone?: "red" | "green"; symbol: string }) {
  const color = tone === "red" ? "text-red-400" : tone === "green" ? "text-emerald-400" : "text-white";
  return (
    <div className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-800">
      <div className="text-zinc-500 text-[11px]">{label}</div>
      <div className={`font-mono font-medium mt-0.5 ${value !== null ? color : "text-zinc-600"}`}>
        {value !== null ? formatPrice(symbol, value) : "—"}
      </div>
    </div>
  );
}

// ─── Outcome review modal ─────────────────────────────────────────────
// Rendered inline in the page component (needs theses + setReviewId
// in scope), so this module-level helper only re-exports the component.
export { OutcomeReview };