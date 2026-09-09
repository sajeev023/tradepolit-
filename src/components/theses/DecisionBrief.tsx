"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  Compass,
  Lightbulb,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  MessageSquare,
  Search,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { EvidencePanel } from "@/components/decision-desk/EvidencePanel";
import { RiskPanel } from "@/components/decision-desk/RiskPanel";
import { WhatChangedPanel } from "@/components/decision-desk/WhatChangedPanel";
import { ContradictionBanner, findContradictions } from "@/components/decision-desk/ContradictionBanner";
import { ConfidenceVisualizer } from "./ConfidenceVisualizer";
import { WhatChangedComparison, type StateSnapshot } from "./WhatChangedComparison";
import { DirectionBadge, StatusPill, RegimeTag, SetupQualityBadge, DecisionMetric } from "@/components/ui/decision-primitives";
export type { StateSnapshot };

export interface DecisionBriefProps {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  bias?: "LONG" | "SHORT" | "NEUTRAL" | string;
  setupQuality?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | string;
  confidenceScore?: number;
  marketRegime?: string;
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  entryZone?: number | string;
  target?: number | string;
  stopLoss?: number | string;
  invalidation?: number | string;
  riskReward?: number | string;
  invalidationConditions?: string;
  aiSummary?: string;
  /** V4.1: structured alternative case / alternative scenario text. */
  alternativeCase?: string;
  thenState?: StateSnapshot;
  nowState?: StateSnapshot;
  dataFreshness?: "FRESH" | "STALE" | "UNAVAILABLE";
  dataFreshnessReason?: string;
  onCommitDecision?: () => void | Promise<void>;
  isCommitting?: boolean;
  isCommitted?: boolean;
  onChallengeDecision?: () => void;
  onExplainEvidence?: (evidence: string) => void;
  onFindContradictions?: () => void;
  onWhatChanged?: () => void;
  className?: string;
}

function formatPrice(n?: number | string) {
  if (n === undefined || n === null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function DecisionBrief({
  symbol,
  timeframe,
  currentPrice,
  bias = "LONG",
  setupQuality = "HIGH GRADE",
  confidence = "HIGH",
  confidenceScore = 74,
  marketRegime = "TRENDING_UP",
  evidenceFor = [],
  evidenceAgainst = [],
  entryZone,
  target,
  stopLoss,
  invalidation,
  riskReward = 2.5,
  invalidationConditions,
  aiSummary,
  alternativeCase,
  thenState,
  nowState: nowStateProp,
  dataFreshness,
  dataFreshnessReason,
  onCommitDecision,
  isCommitting = false,
  isCommitted = false,
  onChallengeDecision,
  onExplainEvidence,
  onFindContradictions,
  onWhatChanged,
  className = "",
}: DecisionBriefProps) {
  const [layer, setLayer] = useState<1 | 2 | 3>(1);
  const [evidenceExpanded, setEvidenceExpanded] = useState(true);

  const isLong = bias?.toUpperCase().includes("LONG") || bias?.toUpperCase().includes("BUY");

  const hasValidPlan =
    Number.isFinite(Number(entryZone)) &&
    Number.isFinite(Number(target)) &&
    Number.isFinite(Number(stopLoss)) &&
    Number.isFinite(Number(invalidation));

  const entry = hasValidPlan ? Number(entryZone) : NaN;
  const tgt = hasValidPlan ? Number(target) : NaN;
  const stp = hasValidPlan ? Number(stopLoss) : NaN;
  const inv = hasValidPlan ? Number(invalidation) : NaN;

  const nowState: StateSnapshot = nowStateProp || {
    price: currentPrice,
    regime: marketRegime,
    confidence: confidence ?? confidenceScore,
    timestamp: new Date().toISOString(),
    freshness: dataFreshness,
    freshnessReason: dataFreshnessReason,
  };

  const contradictions = findContradictions(evidenceFor, evidenceAgainst);
  const hasContradictions = contradictions.length > 0;

  return (
    <div className={`card border-[var(--color-border-strong)] overflow-hidden shadow-2xl ${className}`}>
      {/* ─── SIGNATURE DECISION HEADER ─── */}
      <div className="p-4 sm:p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-text-tertiary)]">
                Decision Brief
              </span>
              <span className="badge badge-neutral font-mono">
                {symbol} · {timeframe.toUpperCase()}
              </span>
              {isCommitted ? (
                <StatusPill status="OPEN" size="xs" />
              ) : (
                <span className="badge badge-neutral">UNCOMMITTED</span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
              {isLong ? "LONG" : "SHORT"} {symbol}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <DirectionBadge direction={bias} size="sm" />
              <SetupQualityBadge quality={setupQuality} />
              <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">
                Confidence {confidence} ({confidenceScore}%)
              </span>
            </div>
          </div>

          {/* Layer tabs as floating segmented control */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 shrink-0">
            {[
              { id: 1 as const, label: "Summary" },
              { id: 2 as const, label: "Analysis" },
              { id: 3 as const, label: "Evidence" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLayer(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  layer === tab.id
                    ? "bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* ─── LAYER 1: SUMMARY ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DecisionMetric label="Current Price" value={formatPrice(currentPrice)} mono />
          <DecisionMetric label="Market Regime" value={<RegimeTag regime={marketRegime} />} />
          <DecisionMetric label="Target R:R" value={`${Number(riskReward).toFixed(2)}:1`} tone="profit" mono />
          <DecisionMetric label="Confidence" value={`${confidence} (${confidenceScore}%)`} tone={confidence === "HIGH" ? "profit" : "accent"} />
        </div>

        {/* ─── LAYER 2: WHAT CHANGED + SYSTEM BELIEF + RISK ─── */}
        {(layer >= 2 || isCommitted) && thenState && (
          <WhatChangedPanel thenState={thenState} nowState={nowState} symbol={symbol} />
        )}

        {layer >= 2 && (
          <>
            <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                  <Cpu size={12} className="text-[var(--color-accent-primary)]" />
                  System Interpretation
                </div>
                <div className="flex items-center gap-1.5">
                  {onChallengeDecision && (
                    <button
                      type="button"
                      onClick={onChallengeDecision}
                      className="text-[10px] font-mono text-[var(--color-accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={10} /> Challenge
                    </button>
                  )}
                  {onWhatChanged && (
                    <button
                      type="button"
                      onClick={onWhatChanged}
                      className="text-[10px] font-mono text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={10} /> What Changed
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {aiSummary || `Technical structure on ${symbol} aligns for a ${bias} thesis with multi-factor confirmation.`}
              </p>
            </div>

            <RiskPanel
              entry={entryZone}
              target={target}
              stopLoss={stopLoss}
              invalidation={invalidation}
              riskReward={riskReward}
              invalidationConditions={invalidationConditions}
            />
          </>
        )}

        {/* ─── LAYER 3: EVIDENCE + CONTRADICTIONS + CONFIDENCE ─── */}
        {layer >= 3 && (
          <>
            <EvidencePanel
              forItems={evidenceFor}
              againstItems={evidenceAgainst}
              timeframe={timeframe}
              symbol={symbol}
            />

            {alternativeCase && (
              <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/50 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                  <Lightbulb size={12} className="text-[var(--color-warning)]" /> Alternative Case
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{alternativeCase}</p>
              </div>
            )}

            <ConfidenceVisualizer score={confidenceScore} tier={confidence as any} compact={false} />
          </>
        )}

        {/* ─── CONTEXTUAL AI ACTIONS ─── */}
        <div className="flex flex-wrap gap-2">
          {onExplainEvidence && (
            <button
              type="button"
              onClick={() => evidenceFor[0] && onExplainEvidence(evidenceFor[0])}
              className="px-2.5 py-1.5 rounded-lg text-[11px] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare size={12} /> Explain Evidence
            </button>
          )}
          {onFindContradictions && hasContradictions && (
            <button
              type="button"
              onClick={onFindContradictions}
              className="px-2.5 py-1.5 rounded-lg text-[11px] border border-[var(--color-warning)]/30 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/5 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search size={12} /> Find Contradictions
            </button>
          )}
          {onChallengeDecision && (
            <button
              type="button"
              onClick={onChallengeDecision}
              className="px-2.5 py-1.5 rounded-lg text-[11px] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle size={12} /> Challenge
            </button>
          )}
        </div>

        {/* ─── COMMIT EXPERIENCE ─── */}
        {!isCommitted && onCommitDecision && (
          <div className="pt-2 space-y-3 border-t border-[var(--color-border-subtle)]">
            <div className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 text-[11px]">
              <div className="font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
                <Target size={12} className="text-[var(--color-accent-primary)]" /> Final Validation
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Decision</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">{isLong ? "LONG" : "SHORT"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Entry</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">{formatPrice(entry)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Invalidation</span>
                  <span className="font-mono font-semibold text-[var(--color-loss)]">{formatPrice(inv)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">R:R</span>
                  <span className="font-mono font-semibold text-[var(--color-profit)]">{Number(riskReward).toFixed(2)}:1</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCommitDecision}
              disabled={isCommitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 shadow-lg select-none disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-accent-primary)",
                color: "#05070B",
                boxShadow: "0 4px 16px rgba(47, 198, 232, 0.25)",
              }}
            >
              <BookmarkCheck size={15} />
              <span>{isCommitting ? "Committing Decision..." : "Commit Decision"}</span>
            </button>
          </div>
        )}

        {isCommitted && (
          <div className="pt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-profit)] border-t border-[var(--color-border-subtle)]">
            <CheckCircle2 size={13} />
            <span className="font-medium">Decision committed to system. Live windowed monitoring active.</span>
          </div>
        )}
      </div>
    </div>
  );
}
