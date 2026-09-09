"use client";

import React from "react";
import { AlertTriangle, Scale, ArrowRight, ShieldCheck, Info } from "lucide-react";
import type { Contradiction as AnalysisContradiction } from "@/lib/analysis-engine";

export type { AnalysisContradiction };

interface ContradictionPanelProps {
  contradictions: AnalysisContradiction[];
  className?: string;
}

export function ContradictionPanel({ contradictions, className = "" }: ContradictionPanelProps) {
  if (!contradictions || contradictions.length === 0) {
    return (
      <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-[var(--color-profit)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">No Major Contradictions</span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          Available evidence is directionally consistent. Monitor for new structural breaks or momentum shifts.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[var(--color-warning)]" />
          <span className="text-xs font-semibold text-[var(--color-warning)]">Contradictions Detected ({contradictions.length})</span>
        </div>
      </div>

      <div className="space-y-3">
        {contradictions.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{c.summary}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  c.impact === "HIGH"
                    ? "border-[var(--color-loss)]/30 text-[var(--color-loss)]"
                    : "border-[var(--color-warning)]/30 text-[var(--color-warning)]"
                }`}
              >
                {c.impact} IMPACT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-start gap-1.5 p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)]">
                <Scale size={10} className="text-[var(--color-text-tertiary)] mt-0.5 shrink-0" />
                <span className="text-[var(--color-text-secondary)]">{c.evidenceA}</span>
              </div>
              <div className="flex items-start gap-1.5 p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)]">
                <Scale size={10} className="text-[var(--color-text-tertiary)] mt-0.5 shrink-0" />
                <span className="text-[var(--color-text-secondary)]">{c.evidenceB}</span>
              </div>
            </div>

            {c.resolution && (
              <div className="flex items-start gap-1.5 text-[10px] text-[var(--color-text-secondary)]">
                <Info size={10} className="text-[var(--color-accent-primary)] mt-0.5 shrink-0" />
                <span><span className="font-semibold text-[var(--color-text-primary)]">How to resolve: </span>{c.resolution}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AlternativeHypothesesPanelProps {
  hypotheses: {
    id: string;
    label: string;
    description: string;
    status: "SUPPORTED" | "PLAUSIBLE" | "WEAK" | "INSUFFICIENT_DATA";
    confidence: number;
    evidenceFor: string[];
    evidenceAgainst: string[];
    invalidationCondition: string;
  }[];
  className?: string;
}

export function AlternativeHypothesesPanel({ hypotheses, className = "" }: AlternativeHypothesesPanelProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case "SUPPORTED":
        return "text-[var(--color-profit)] border-[var(--color-profit)]/30 bg-[var(--color-profit)]/5";
      case "PLAUSIBLE":
        return "text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/5";
      case "WEAK":
        return "text-[var(--color-warning)] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5";
      default:
        return "text-[var(--color-text-tertiary)] border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40";
    }
  };

  return (
    <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scale size={14} className="text-[var(--color-accent-primary)]" />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">Alternative Hypotheses</span>
      </div>

      <div className="space-y-3">
        {hypotheses.map((h) => (
          <div
            key={h.id}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{h.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusColor(h.status)}`}>
                  {h.status.replace("_", " ")}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">{h.confidence}%</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{h.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              {h.evidenceFor.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[var(--color-profit)] font-semibold">Supporting</span>
                  <ul className="space-y-0.5">
                    {h.evidenceFor.slice(0, 2).map((e, i) => (
                      <li key={i} className="text-[var(--color-text-secondary)]">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {h.evidenceAgainst.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[var(--color-loss)] font-semibold">Against</span>
                  <ul className="space-y-0.5">
                    {h.evidenceAgainst.slice(0, 2).map((e, i) => (
                      <li key={i} className="text-[var(--color-text-secondary)]">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-start gap-1.5 text-[10px] text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border-subtle)]">
              <ArrowRight size={10} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
              <span><span className="font-semibold text-[var(--color-text-primary)]">Invalidation: </span>{h.invalidationCondition}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InvalidationPanelProps {
  invalidation?: {
    condition: string;
    level: number;
    source: string;
    rationale: string;
  } | null;
  symbol?: string;
  className?: string;
}

export function InvalidationPanel({ invalidation, symbol = "Asset", className = "" }: InvalidationPanelProps) {
  if (!invalidation) {
    return (
      <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-[var(--color-text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">Invalidation Condition</span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)]">No directional thesis — invalidation condition is not applicable.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={14} className="text-[var(--color-warning)]" />
        <span className="text-xs font-semibold text-[var(--color-warning)]">What Would Invalidate This?</span>
      </div>

      <div className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{invalidation.condition}</span>
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">Source: {invalidation.source}</span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{invalidation.rationale}</p>
        <div className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
          Deterministic level for {symbol}: ${Number(invalidation.level).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
