"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Loader2, ChevronDown, Trash2, ClipboardList, Share2, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format-price";
import { OutcomeReview } from "@/components/theses/OutcomeReview";
import { Chip, EmptyState, Label, Skeleton, Stat } from "@/components/fd/primitives";
import { TradeLadder } from "@/components/tools/trade-ladder";

/**
 * THESES — the V2 retention core.
 *
 * Every analysis can become a tracked thesis: bias, entry, stop,
 * invalidation, target, R:R — validated by the trade-logic engine before
 * persistence, monitored against live prices, resolved to HIT /
 * INVALIDATED / EXPIRED, and closed with an outcome review that feeds
 * the personal-insight layer.
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

const STATUS: Record<Thesis["status"], { label: string; tone: "signal" | "gain" | "loss" | "neutral" }> = {
  OPEN: { label: "Monitoring", tone: "signal" },
  HIT: { label: "Target hit", tone: "gain" },
  INVALIDATED: { label: "Invalidated", tone: "loss" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "HIT", label: "Hit" },
  { id: "INVALIDATED", label: "Invalidated" },
  { id: "EXPIRED", label: "Expired" },
];

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
  const total = theses?.length ?? 0;

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Theses</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Every call, <em className="text-[var(--accent)]">tracked.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Save a thesis from any analysis. TradePilot monitors it against live prices and tells you when it resolves — then asks how it went.
        </p>
      </header>

      {(openCount > 0 || resolvedNoOutcome > 0) && (
        <div className="card grid grid-cols-3 gap-6 p-5 sm:p-6">
          <Stat label="In view" value={String(total)} />
          <Stat label="Monitoring" value={String(openCount)} tone="signal" />
          <Stat label="Need review" value={String(resolvedNoOutcome)} tone={resolvedNoOutcome > 0 ? "loss" : "neutral"} />
        </div>
      )}

      <div role="tablist" aria-label="Status" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ id, label }) => {
          const on = filter === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(id)}
              className="h-9 shrink-0 cursor-pointer rounded-lg px-4 font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors"
              style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "var(--color-text-tertiary)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}</div>
      ) : !theses || theses.length === 0 ? (
        <div className="card p-8 sm:p-12">
          <EmptyState
            icon={<Target size={18} />}
            title="No theses yet"
            body="Run an analysis on a chart, then tap Save as Thesis. TradePilot will watch it and close the loop when it resolves."
            action={<Link href="/charts" className="btn-secondary btn-sm">Open Markets</Link>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
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
        </ul>
      )}

      {reviewId &&
        (() => {
          const thesis = theses?.find((t) => t.id === reviewId);
          if (!thesis || thesis.status === "OPEN") return null;
          return <OutcomeReview thesisId={thesis.id} symbol={thesis.symbol} status={thesis.status} onDone={() => setReviewId(null)} />;
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
  const status = STATUS[thesis.status];
  const [sharing, setSharing] = useState(false);
  const router = useRouter();
  const biasColor = isLong ? "var(--color-profit)" : "var(--color-loss)";

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
    <li className="card overflow-hidden">
      <button onClick={onToggle} aria-expanded={expanded} className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 p-4 text-left transition-colors hover:bg-[var(--color-bg-hover)] sm:px-5">
        <span className="h-11 w-[3px] rounded-full" style={{ background: biasColor }} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{thesis.symbol}</span>
            <Chip tone={isLong ? "gain" : "loss"}>{thesis.bias}</Chip>
            <Chip tone={status.tone} dot>{status.label}</Chip>
            {thesis.outcome && <Chip tone="signal">Outcome logged</Chip>}
          </span>
          <span className="mt-1.5 block font-mono text-[11.5px] text-[var(--color-text-quaternary)]">
            {thesis.timeframe}
            {entry !== null && <> · entry {formatPrice(thesis.symbol, entry)}</>}
            {rr !== null && <> · R:R {rr.toFixed(2)}:1</>}
            {" · "}{new Date(thesis.createdAt).toLocaleDateString()}
            {thesis.regimeAtCreation && <> · {thesis.regimeAtCreation}</>}
          </span>
        </span>
        <ChevronDown size={16} className={`text-[var(--color-text-tertiary)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="animate-enter border-t px-4 py-5 sm:px-5" style={{ borderColor: "var(--hairline)" }}>
          <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
            {entry !== null && stop !== null && entry !== stop ? (
              <TradeLadder direction={thesis.bias} entry={entry} stop={stop} target={target ?? undefined} />
            ) : (
              <p className="text-[13px] text-[var(--color-text-tertiary)]">Levels unavailable for this thesis.</p>
            )}

            <div className="min-w-0 space-y-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                <Level label="Entry zone" value={entry} symbol={thesis.symbol} />
                <Level label="Stop loss" value={stop} tone="loss" symbol={thesis.symbol} />
                <Level label="Invalidation" value={num(thesis.invalidation)} tone="loss" symbol={thesis.symbol} />
                <Level label="Target" value={target} tone="gain" symbol={thesis.symbol} />
              </div>

              {thesis.invalidationConditions && (
                <p className="rounded-lg border p-3.5 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">Invalidated if </span>
                  {thesis.invalidationConditions}
                </p>
              )}

              {thesis.aiSummary && (
                <p className="line-clamp-6 border-l-2 pl-3.5 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]" style={{ borderColor: "var(--accent)" }}>{thesis.aiSummary}</p>
              )}

              {thesis.outcome && (
                <div className="rounded-lg border p-3.5" style={{ borderColor: "rgba(var(--accent-rgb),0.3)", background: "rgba(var(--accent-rgb),0.05)" }}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)]">
                    Outcome: {thesis.outcome.result} {thesis.outcome.tookTrade ? "· traded" : "· observed"}
                    {thesis.outcome.rMultiple !== null && <> · {num(thesis.outcome.rMultiple)?.toFixed(2)}R</>}
                  </p>
                  {thesis.outcome.whatILearned && <p className="mt-1.5 text-[13px] text-[var(--color-text-secondary)]">{thesis.outcome.whatILearned}</p>}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {!thesis.outcome && thesis.status !== "OPEN" && (
                  <button onClick={onReview} className="btn-primary btn-sm"><ClipboardList size={13} /> Review outcome</button>
                )}
                {/* Journal handoff — the analysis → trade-log bridge. */}
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
                  className="btn-secondary btn-sm"
                >
                  <BookOpen size={13} /> Log in journal
                </button>
                <button onClick={handleShare} disabled={sharing} className="btn-ghost btn-sm disabled:opacity-50">
                  {sharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Share
                </button>
                <button onClick={onDelete} className="btn-ghost btn-sm ml-auto hover:!text-[var(--color-loss)]">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function Level({ label, value, tone, symbol }: { label: string; value: number | null; tone?: "loss" | "gain"; symbol: string }) {
  return <Stat label={label} value={value !== null ? formatPrice(symbol, value) : "—"} tone={tone ?? "neutral"} />;
}

// OutcomeReview is rendered inline in the page component (it needs the
// theses list + setReviewId in scope); re-exported for existing imports.
export { OutcomeReview };
