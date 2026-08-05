"use client";

import { useState, useEffect, useCallback, memo, Profiler } from "react";
import { profiler } from "@/lib/performance-profiler";
import { X, Bookmark, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface SavedAnalysis {
  id: string;
  symbol: string;
  timeframe: string;
  bias: string;
  confidence: string;
  support: string;
  resistance: string;
  aiSummary: string;
  savedAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentAnalysis?: any | null;
}

function BiasBadge({ bias }: { bias: string }) {
  const isBull = bias.includes("BUY") || bias.includes("LONG");
  const isBear = bias.includes("SELL") || bias.includes("SHORT");
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
      style={{
        color: isBull ? "var(--color-profit)" : isBear ? "var(--color-loss)" : "var(--color-text-secondary)",
        borderColor: isBull ? "rgba(34,197,94,0.25)" : isBear ? "rgba(239,68,68,0.25)" : "var(--color-border-default)",
        backgroundColor: isBull ? "rgba(34,197,94,0.08)" : isBear ? "rgba(239,68,68,0.08)" : "var(--color-bg-tertiary)",
      }}
    >
      {bias}
    </span>
  );
}

export const SavedAnalysesPanel = memo(function SavedAnalysesPanel({ isOpen, onClose, currentAnalysis }: Props) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/saved-analyses");
      const body = await res.json();
      if (res.ok && body.data) setAnalyses(body.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchAnalyses();
  }, [isOpen, fetchAnalyses]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/ai/saved-analyses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id));
        toast.success("Bookmark removed");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCopy = (analysis: SavedAnalysis, id: string) => {
    const text = `TradCopilot Analysis — ${analysis.symbol} ${analysis.timeframe}
Bias: ${analysis.bias} | Confidence: ${analysis.confidence}
Support: $${analysis.support} | Resistance: $${analysis.resistance}
---
${analysis.aiSummary}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const compareAnalysis = analyses.find(a => a.id === compareId);

  return (
    <Profiler id="SavedAnalysesPanel" onRender={(id, phase, actualDuration) => profiler.recordComponentRender(id, actualDuration)}>
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "min(440px, 100vw)",
          backgroundColor: "var(--color-bg-secondary)",
          borderLeft: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 shrink-0 border-b border-[var(--color-border-subtle)]"
          style={{ height: "56px" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bookmark size={14} className="text-amber-400" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              Saved Analyses
            </span>
            {analyses.length > 0 && (
              <span className="text-[10px] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-full text-[var(--color-text-tertiary)] font-mono">
                {analyses.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Compare Mode Banner */}
        {compareId && compareAnalysis && currentAnalysis && (
          <div className="mx-3 mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 shrink-0">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">
              Comparing: {compareAnalysis.symbol} {compareAnalysis.timeframe} vs Current
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-[var(--color-text-tertiary)] mb-1 font-semibold">
                  {formatDate(compareAnalysis.savedAt)} (Saved)
                </p>
                <div className="space-y-1 font-mono text-[10px]">
                  <p>Bias: <span className="font-bold text-[var(--color-text-primary)]">{compareAnalysis.bias}</span></p>
                  <p>Support: <span className="text-emerald-400 font-bold">${compareAnalysis.support}</span></p>
                  <p>Resistance: <span className="text-rose-400 font-bold">${compareAnalysis.resistance}</span></p>
                </div>
              </div>
              <div className="border-l border-[var(--color-border-default)] pl-2">
                <p className="text-teal-400 mb-1 font-semibold">Current Setup</p>
                <div className="space-y-1 font-mono text-[10px]">
                  <p>Bias: <span className="font-bold text-[var(--color-text-primary)]">{currentAnalysis.bias}</span></p>
                  <p>Support: <span className="text-emerald-400 font-bold">${currentAnalysis.support}</span></p>
                  <p>Resistance: <span className="text-rose-400 font-bold">${currentAnalysis.resistance}</span></p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCompareId(null)}
              className="mt-2 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Close Comparison
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl border border-[var(--color-border-subtle)] animate-pulse space-y-2">
                  <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-12 w-full bg-[var(--color-bg-tertiary)] rounded" />
                </div>
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border-default)] flex items-center justify-center mb-4">
                <Bookmark size={18} className="text-[var(--color-text-quaternary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">No bookmarked analyses</p>
              <p className="text-xs text-[var(--color-text-quaternary)] max-w-[200px]">
                Click &quot;Save&quot; on any AI chart analysis message to bookmark key levels here.
              </p>
            </div>
          ) : (
            analyses.map(item => {
              const isConfirmDelete = confirmDeleteId === item.id;
              const isDeleting = deletingId === item.id;
              const isComparing = compareId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-xl border p-4 transition-all space-y-3 ${
                    isComparing
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)]"
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                        {item.symbol}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-hover)] px-1.5 py-0.5 rounded">
                        {item.timeframe}
                      </span>
                      <BiasBadge bias={item.bias} />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(item, item.id)}
                        className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                        title="Copy analysis text"
                      >
                        {copiedId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete bookmark"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Key Levels */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[var(--color-bg-secondary)] p-2 rounded-lg border border-[var(--color-border-subtle)]">
                    <div>
                      <span className="text-[9px] text-emerald-500 font-bold block">SUPPORT</span>
                      <span className="text-emerald-400 font-bold">${item.support}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-rose-500 font-bold block">RESISTANCE</span>
                      <span className="text-rose-400 font-bold">${item.resistance}</span>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {item.aiSummary && (
                    <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-3">
                      {item.aiSummary}
                    </p>
                  )}

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--color-text-tertiary)] font-mono">
                    <span>Saved {formatDate(item.savedAt)}</span>

                    {currentAnalysis && (
                      <button
                        onClick={() => setCompareId(isComparing ? null : item.id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                          isComparing
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {isComparing ? "Comparing" : "Compare"}
                      </button>
                    )}
                  </div>

                  {/* Delete confirm overlay */}
                  {isConfirmDelete && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-xl px-3">
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-medium mr-1">Delete bookmark?</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/25 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] text-[11px] font-semibold hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0 text-center border-t border-[var(--color-border-subtle)]">
          <p className="text-[10px] text-[var(--color-text-tertiary)]">
            Bookmarked levels persist across restarts
          </p>
        </div>
      </div>
    </>
    </Profiler>
  );
});
