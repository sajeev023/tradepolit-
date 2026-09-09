"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  ClipboardList,
  Sparkles,
  Plus,
  RefreshCw,
  Layers,
  Activity,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusPill, DirectionBadge, RegimeTag, SetupQualityBadge, ConfidenceBadge } from "@/components/ui/decision-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceChip } from "@/components/theses/EvidenceChip";
import { OutcomeReview } from "@/components/theses/OutcomeReview";
import { PageShell, PageHeader, SectionCard, AttentionBanner } from "@/components/layout/page-shell";

type StatusFilter = "ALL" | "OPEN" | "RESOLVED" | "HIT" | "INVALIDATED" | "EXPIRED" | "NEEDS_REVIEW";
type SortField = "createdAt" | "symbol" | "confidence" | "status" | "riskReward";

export default function DecisionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  // Fetch theses
  const { data: rawTheses, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["theses"],
    queryFn: async () => {
      const res = await fetch("/api/v1/theses?status=ALL");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load decisions");
      return body.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/theses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete decision");
    },
    onSuccess: () => {
      toast.success("Decision deleted");
      queryClient.invalidateQueries({ queryKey: ["theses"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter & search
  const filteredTheses = useMemo(() => {
    if (!rawTheses) return [];
    return rawTheses
      .filter((t) => {
        // Status filter
        if (filter === "OPEN" && t.status !== "OPEN") return false;
        if (filter === "RESOLVED" && t.status === "OPEN") return false;
        if (filter === "HIT" && t.status !== "HIT") return false;
        if (filter === "INVALIDATED" && t.status !== "INVALIDATED") return false;
        if (filter === "EXPIRED" && t.status !== "EXPIRED") return false;
        if (filter === "NEEDS_REVIEW" && (t.status === "OPEN" || !!t.outcome)) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSymbol = t.symbol.toLowerCase().includes(q);
          const matchSetup = (t.setupType || "").toLowerCase().includes(q);
          const matchRegime = (t.regimeAtCreation || "").toLowerCase().includes(q);
          if (!matchSymbol && !matchSetup && !matchRegime) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "createdAt") {
          cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortField === "symbol") {
          cmp = a.symbol.localeCompare(b.symbol);
        } else if (sortField === "confidence") {
          cmp = (a.confidence || "").localeCompare(b.confidence || "");
        } else if (sortField === "status") {
          cmp = a.status.localeCompare(b.status);
        } else if (sortField === "riskReward") {
          cmp = Number(b.riskReward || 0) - Number(a.riskReward || 0);
        }
        return sortAsc ? -cmp : cmp;
      });
  }, [rawTheses, filter, searchQuery, sortField, sortAsc]);

  const openCount = rawTheses?.filter((t) => t.status === "OPEN").length ?? 0;
  const needsReviewCount = rawTheses?.filter((t) => t.status !== "OPEN" && !t.outcome).length ?? 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const selectedForReview = rawTheses?.find((t) => t.id === reviewId);

  return (
    <PageShell gap="md" className="pb-12 animate-fade-in">
      <PageHeader
        eyebrow="Financial Decision Intelligence"
        eyebrowIcon={<Compass size={14} />}
        title="Decision History & Review Desk"
        subtitle="Auditable repository of every committed trading decision, evidence snapshot, and outcome attribution."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/charts" className="btn-primary btn-sm">
              <Plus size={14} />
              <span>New Decision Brief</span>
            </Link>
            <button onClick={() => refetch()} className="icon-button" title="Refresh decisions">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="app-shell__full">
        {needsReviewCount > 0 && filter !== "NEEDS_REVIEW" && (
          <AttentionBanner
            severity="medium"
            title={
              <span className="flex items-center gap-2">
                <ClipboardList size={14} />
                {needsReviewCount} resolved decision{needsReviewCount > 1 ? "s" : ""} need outcome review
              </span>
            }
            action={
              <button onClick={() => setFilter("NEEDS_REVIEW")} className="btn-secondary btn-sm">
                Show Review Queue
              </button>
            }
          />
        )}
      </div>

      <div className="app-shell__full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {[
            { key: "ALL", label: "All Decisions", count: rawTheses?.length },
            { key: "OPEN", label: "Active", count: openCount },
            { key: "RESOLVED", label: "Resolved" },
            { key: "NEEDS_REVIEW", label: "Needs Review", count: needsReviewCount, alert: needsReviewCount > 0 },
            { key: "HIT", label: "Target Hit" },
            { key: "INVALIDATED", label: "Invalidated" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as StatusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border ${
                filter === tab.key
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border-[var(--color-border-strong)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-hover)]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1 rounded-full ${
                    tab.alert
                      ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
                      : "bg-[var(--color-bg-deepest)] text-[var(--color-text-quaternary)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-quaternary)]" />
            <input
              type="text"
              placeholder="Search symbol, setup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-[var(--color-accent-primary)] font-mono"
            />
          </div>
          <div className="hidden sm:flex items-center border border-[var(--color-border-subtle)] rounded-lg p-0.5 bg-[var(--color-bg-deepest)]">
            <button
              onClick={() => setDensity("comfortable")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                density === "comfortable" ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]" : "text-[var(--color-text-quaternary)]"
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity("compact")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                density === "compact" ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]" : "text-[var(--color-text-quaternary)]"
              }`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* ── Financial Data Table ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <RefreshCw size={24} className="animate-spin text-[var(--color-accent-primary)] mb-2" />
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">Loading Decision History...</span>
        </div>
      ) : filteredTheses.length === 0 ? (
        <EmptyState
          icon={<Compass size={20} />}
          badge="Empty Decision Ledger"
          title={searchQuery ? "No decisions match your search" : "No decisions recorded yet"}
          description={
            searchQuery
              ? "Try adjusting your search criteria or filters."
              : "Commit your first trade thesis from the chart analysis desk to begin building your decision intelligence moat."
          }
          reason="The decision history records what you knew, what you decided, and what happened."
          actionLabel={searchQuery ? "Clear Search" : "Open Market Desk"}
          actionHref={searchQuery ? undefined : "/charts"}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="py-2.5 px-3 sm:px-4 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort("symbol")}>
                    <div className="flex items-center gap-1">
                      <span>Asset</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Setup</th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort("confidence")}>
                    <div className="flex items-center gap-1">
                      <span>Confidence</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Regime</th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort("riskReward")}>
                    <div className="flex items-center gap-1">
                      <span>Target R:R</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">Attribution</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell cursor-pointer hover:text-[var(--color-text-primary)]" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1">
                      <span>Committed</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)] text-xs font-mono">
                {filteredTheses.map((t) => {
                  const isExpanded = expandedId === t.id;
                  const isResolved = t.status !== "OPEN";
                  const hasOutcome = !!t.outcome;
                  const needsReview = isResolved && !hasOutcome;

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        className={`hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer ${
                          isExpanded ? "bg-[var(--color-bg-hover)]" : ""
                        } ${needsReview ? "border-l-2 border-l-[var(--color-warning)]" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        {/* Asset */}
                        <td className={`py-3 px-3 sm:px-4 font-bold text-[var(--color-text-primary)] ${density === "compact" ? "py-2" : "py-3"}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{t.symbol}</span>
                            <span className="text-[10px] font-normal text-[var(--color-text-tertiary)] px-1 rounded bg-[var(--color-bg-deepest)]">
                              {t.timeframe}
                            </span>
                            {needsReview && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />}
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="py-3 px-3">
                          <DirectionBadge direction={t.bias} size="xs" />
                        </td>

                        {/* Setup */}
                        <td className="py-3 px-3">
                          <SetupQualityBadge quality={t.setupType} />
                        </td>

                        {/* Confidence */}
                        <td className="py-3 px-3">
                          <ConfidenceBadge confidence={t.confidence} />
                        </td>

                        {/* Regime */}
                        <td className="py-3 px-3 hidden md:table-cell">
                          <RegimeTag regime={t.regimeAtCreation} />
                        </td>

                        {/* Target R:R */}
                        <td className="py-3 px-3 font-semibold text-[var(--color-profit)]">
                          {Number(t.riskReward || 2.0).toFixed(2)}:1
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <StatusPill status={t.status} size="xs" />
                        </td>

                        {/* Attribution */}
                        <td className="py-3 px-3 hidden lg:table-cell text-[11px]">
                          {hasOutcome ? (
                            <span className="text-[var(--color-text-primary)] font-medium truncate block max-w-[160px]">
                              {t.outcome.attribution ? t.outcome.attribution.replace(/_/g, " ") : t.outcome.result}
                            </span>
                          ) : needsReview ? (
                            <span className="text-[var(--color-warning)] flex items-center gap-1">
                              <ClipboardList size={11} /> Review needed
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-quaternary)]">—</span>
                          )}
                        </td>

                        {/* Committed */}
                        <td className="py-3 px-3 hidden sm:table-cell text-[11px] text-[var(--color-text-tertiary)]">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {needsReview && (
                              <button
                                onClick={() => setReviewId(t.id)}
                                className="px-2 py-1 rounded bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-muted)] text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-[rgba(var(--accent-rgb),0.2)]"
                                title="Review Outcome"
                              >
                                <ClipboardList size={11} /> Review
                              </button>
                            )}

                            <Link
                              href={`/theses/${t.id}`}
                              className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                              title="Open Full Decision Record"
                            >
                              <ExternalLink size={13} />
                            </Link>

                            <button
                              onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]"
                              aria-label="Expand row"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expandable Inline Audit Drawer ── */}
                      {isExpanded && (
                        <tr className="bg-[var(--color-bg-deepest)]/60">
                          <td colSpan={10} className="p-4 sm:p-5 border-b border-[var(--color-border-subtle)]">
                            <div className="space-y-4 text-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
                                  <Compass size={14} className="text-[var(--color-accent-primary)]" />
                                  <span>Decision Audit Summary · {t.symbol}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Link
                                    href={`/theses/${t.id}`}
                                    className="text-xs font-semibold text-[var(--color-accent-primary)] hover:underline flex items-center gap-1"
                                  >
                                    <span>Open Full Decision Record</span>
                                    <ExternalLink size={11} />
                                  </Link>
                                  <button
                                    onClick={() => {
                                      if (confirm("Delete this decision?")) deleteMutation.mutate(t.id);
                                    }}
                                    className="text-xs text-[var(--color-text-quaternary)] hover:text-[var(--color-loss)] flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>

                              {/* Price Boundaries */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Entry Zone</span>
                                  <span className="font-mono font-semibold">${Number(t.entryZone).toLocaleString()}</span>
                                </div>
                                <div className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                                  <span className="text-[10px] text-[var(--color-profit)] block">Target</span>
                                  <span className="font-mono font-semibold text-[var(--color-profit)]">${Number(t.target).toLocaleString()}</span>
                                </div>
                                <div className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                                  <span className="text-[10px] text-[var(--color-loss)] block">Stop Loss</span>
                                  <span className="font-mono font-semibold text-[var(--color-loss)]">${Number(t.stopLoss).toLocaleString()}</span>
                                </div>
                                <div className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
                                  <span className="text-[10px] text-[var(--color-warning)] block">Invalidation</span>
                                  <span className="font-mono font-semibold text-[var(--color-warning)]">${Number(t.invalidation).toLocaleString()}</span>
                                </div>
                              </div>

                              {/* Evidence Snapshot */}
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block mb-1.5">
                                  Recorded Evidence
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {(t.evidenceFor || []).slice(0, 5).map((item: string, idx: number) => (
                                    <EvidenceChip key={idx} item={item} type="for" timeframe={t.timeframe} timestamp={t.createdAt} />
                                  ))}
                                  {(t.evidenceAgainst || []).slice(0, 3).map((item: string, idx: number) => (
                                    <EvidenceChip key={idx} item={item} type="against" timeframe={t.timeframe} timestamp={t.createdAt} />
                                  ))}
                                  {(t.evidenceFor?.length || 0) > 5 && (
                                    <span className="text-[10px] text-[var(--color-text-quaternary)] self-center">+{t.evidenceFor.length - 5} more</span>
                                  )}
                                </div>
                              </div>

                              {/* AI Reasoning Summary */}
                              {t.aiSummary && (
                                <p className="text-[11px] text-[var(--color-text-secondary)] font-sans leading-relaxed pt-1">
                                  {t.aiSummary}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedForReview && (
        <OutcomeReview
          thesisId={selectedForReview.id}
          symbol={selectedForReview.symbol}
          status={selectedForReview.status}
          onDone={() => {
            setReviewId(null);
            queryClient.invalidateQueries({ queryKey: ["theses"] });
          }}
        />
      )}
    </PageShell>
  );
}
