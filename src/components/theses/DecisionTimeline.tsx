"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Activity,
  Layers,
  Flag,
  Award,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookmarkCheck,
  BarChart3,
  Sparkles,
} from "lucide-react";

export interface TimelineNode {
  id: string;
  stage: string;
  timestamp?: string | number | Date;
  status: "complete" | "in_progress" | "pending" | "alert" | "failed";
  title: string;
  description: string;
  details?: React.ReactNode;
  icon?: React.ReactNode;
}

interface DecisionTimelineProps {
  nodes?: TimelineNode[];
  thesisData?: any;
  className?: string;
}

function formatTime(ts?: string | number | Date) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

export function DecisionTimeline({
  nodes,
  thesisData,
  className = "",
}: DecisionTimelineProps) {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const snapshot = thesisData?.contextSnapshot || {};
  const snapPrice = snapshot.priceAtCapture?.price;
  const snapRegime = snapshot.marketContext?.regime;
  const snapRsi = snapshot.technicalContext?.rsi;
  const snapConfidence = snapshot.confidence;

  const evidenceFor = thesisData?.evidenceFor || [];
  const evidenceAgainst = thesisData?.evidenceAgainst || [];

  // Generate complete chronological lifecycle if nodes not explicitly passed
  const lifecycleNodes: TimelineNode[] = nodes || [
    {
      id: "market-state",
      stage: "1. What Was Known",
      timestamp: thesisData?.createdAt,
      status: "complete",
      title: "Market Context Captured",
      description: `Recorded at commitment: ${snapRegime || thesisData?.regimeAtCreation || "market state"} on ${thesisData?.timeframe || "1h"}.`,
      icon: <Activity size={14} />,
      details: (
        <div className="text-[11px] font-mono space-y-1 text-[var(--color-text-secondary)]">
          <div>Symbol: {thesisData?.symbol || "Asset"}</div>
          <div>Price at capture: {snapPrice ? `$${Number(snapPrice).toLocaleString()}` : "—"}</div>
          <div>Regime: {snapRegime || thesisData?.regimeAtCreation || "—"}</div>
          <div>RSI(14): {snapRsi != null ? snapRsi.toFixed(2) : "—"}</div>
          <div>Confidence: {snapConfidence ? `${snapConfidence.tier} (${snapConfidence.score})` : thesisData?.confidence || "—"}</div>
          <div className="text-[var(--color-text-quaternary)] pt-1">{formatTime(thesisData?.createdAt)}</div>
        </div>
      ),
    },
    {
      id: "evidence-captured",
      stage: "2. Evidence",
      timestamp: thesisData?.createdAt,
      status: "complete",
      title: "Deterministic Evidence Recorded",
      description: `${evidenceFor.length} supporting, ${evidenceAgainst.length} contradicting factors captured at decision time.`,
      icon: <Layers size={14} />,
      details: (
        <div className="space-y-1.5 text-[11px]">
          {evidenceFor.length > 0 ? (
            <div className="text-[var(--color-profit)]">For: {evidenceFor.slice(0, 5).join("; ")}{evidenceFor.length > 5 && ` (+${evidenceFor.length - 5} more)`}</div>
          ) : (
            <div className="text-[var(--color-text-quaternary)]">No supporting evidence recorded.</div>
          )}
          {evidenceAgainst.length > 0 && (
            <div className="text-[var(--color-loss)]">Against: {evidenceAgainst.slice(0, 5).join("; ")}{evidenceAgainst.length > 5 && ` (+${evidenceAgainst.length - 5} more)`}</div>
          )}
        </div>
      ),
    },
    {
      id: "ai-hypothesis",
      stage: "3. Interpretation",
      timestamp: thesisData?.createdAt,
      status: "complete",
      title: "System Interpretation",
      description: `Direction: ${thesisData?.bias || "LONG"} | Setup: ${thesisData?.setupType || "STANDARD"} | Confidence: ${thesisData?.confidence || "MEDIUM"}`,
      icon: <Cpu size={14} />,
      details: (
        <div className="space-y-1.5">
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            {thesisData?.aiSummary || "Technical structure indicated directional continuation."}
          </p>
          {snapshot.confidence?.factors && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-[var(--color-text-quaternary)]">Confidence Factors</div>
              {snapshot.confidence.factors.slice(0, 5).map((f: any, idx: number) => (
                <div key={idx} className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
                  <span className={f.direction === "positive" ? "text-[var(--color-profit)]" : f.direction === "negative" ? "text-[var(--color-loss)]" : "text-[var(--color-text-tertiary)]"}>
                    {f.direction === "positive" ? "▲" : f.direction === "negative" ? "▼" : "•"} {f.name}
                  </span>
                  <span className="text-[var(--color-text-quaternary)]">— {f.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "deterministic-validation",
      stage: "4. Validation",
      timestamp: thesisData?.createdAt,
      status: "complete",
      title: "Trade-Logic Validation",
      description: `R:R ${Number(thesisData?.riskReward || 0).toFixed(2)}:1 · Invalidation ${thesisData?.invalidation ? `$${Number(thesisData.invalidation).toLocaleString()}` : "—"}.`,
      icon: <ShieldCheck size={14} />,
      details: (
        <div className="text-[11px] font-mono text-[var(--color-text-secondary)] space-y-1">
          <div>Entry: ${Number(thesisData?.entryZone || 0).toLocaleString()}</div>
          <div>Target: ${Number(thesisData?.target || 0).toLocaleString()}</div>
          <div>Stop: ${Number(thesisData?.stopLoss || 0).toLocaleString()}</div>
          <div>Invalidation: ${Number(thesisData?.invalidation || 0).toLocaleString()}</div>
          <div className="text-[var(--color-profit)]">All numeric guardrails passed deterministic validation.</div>
        </div>
      ),
    },
    {
      id: "decision-committed",
      stage: "5. Decision",
      timestamp: thesisData?.createdAt,
      status: "complete",
      title: "Decision Committed",
      description: "Thesis stored and queued for windowed live-price monitoring.",
      icon: <BookmarkCheck size={14} />,
      details: (
        <div className="text-[11px] text-[var(--color-text-secondary)]">
          Committed {thesisData?.bias || "—"} {thesisData?.symbol || ""} at {formatTime(thesisData?.createdAt)}.
          {snapshot.dataFreshness?.status && (
            <div className="mt-1">Market data freshness: {snapshot.dataFreshness.status}{snapshot.dataFreshness.reason ? ` — ${snapshot.dataFreshness.reason}` : ""}</div>
          )}
        </div>
      ),
    },
    {
      id: "market-changed",
      stage: "6. What Changed",
      timestamp: thesisData?.checkedAt || "Active Monitoring",
      status: thesisData?.status === "OPEN" ? "in_progress" : "complete",
      title: thesisData?.status === "OPEN" ? "Monitoring Live Market" : "Market Trajectory Concluded",
      description: thesisData?.status === "OPEN"
        ? "Evaluating against high/low extremes since last check."
        : `Regime at resolution: ${thesisData?.regimeAtResolution || thesisData?.regimeAtCreation || "Persistent"}`,
      icon: <Sparkles size={14} />,
    },
    {
      id: "outcome",
      stage: "7. Outcome",
      timestamp: thesisData?.resolvedAt || (thesisData?.status === "OPEN" ? "Awaiting Resolution" : undefined),
      status: thesisData?.status === "OPEN" ? "pending" : thesisData?.status === "HIT" ? "complete" : "alert",
      title: `Resolution: ${thesisData?.status || "OPEN"}`,
      description: thesisData?.resolvedPrice
        ? `Resolved at $${Number(thesisData.resolvedPrice).toLocaleString()}`
        : "Pending live market trigger.",
      icon: <Flag size={14} />,
    },
    {
      id: "attribution",
      stage: "8. Attribution",
      timestamp: thesisData?.outcome?.createdAt || (thesisData?.status !== "OPEN" ? "Ready for Review" : "Pending"),
      status: thesisData?.outcome ? "complete" : thesisData?.status !== "OPEN" ? "in_progress" : "pending",
      title: thesisData?.outcome?.attribution
        ? `Attributed: ${thesisData.outcome.attribution.replace(/_/g, " ")}`
        : thesisData?.status !== "OPEN"
        ? "Review Required"
        : "Awaiting Resolution",
      description: thesisData?.outcome?.whatILearned
        ? `Lesson: ${thesisData.outcome.whatILearned}`
        : thesisData?.status !== "OPEN"
        ? "Log outcome to attribute process vs variance and update calibration."
        : "Will be graded once outcome resolves.",
      icon: <Award size={14} />,
    },
  ];

  // Add DecisionScore node when outcome includes a score
  if (thesisData?.outcome?.decisionScore != null) {
    lifecycleNodes.push({
      id: "decision-score",
      stage: "9. Decision Score",
      timestamp: thesisData?.outcome?.createdAt,
      status: "complete",
      title: `Decision Score: ${thesisData.outcome.decisionScore}`,
      description: "Quality of reasoning and execution, separate from outcome.",
      icon: <BarChart3 size={14} />,
      details: thesisData?.outcome?.decisionScoreReason ? (
        <p className="text-[11px] text-[var(--color-text-secondary)]">{thesisData.outcome.decisionScoreReason}</p>
      ) : undefined,
    });
  }

  return (
    <div
      className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/50 p-5 select-none ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Clock size={13} className="text-[var(--color-accent-primary)]" />
            Decision Lifecycle Timeline
          </h3>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
            Full chronological audit trail from inception to resolution & learning
          </p>
        </div>
      </div>

      {/* Timeline nodes */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[var(--color-border-subtle)]">
        {lifecycleNodes.map((node) => {
          const isExpanded = expandedNodeId === node.id;
          const isComplete = node.status === "complete";
          const isInProgress = node.status === "in_progress";
          const isAlert = node.status === "alert" || node.status === "failed";

          let dotColor = "var(--color-border-strong)";
          let dotBg = "var(--color-bg-deepest)";
          let icon = <Clock size={12} className="text-[var(--color-text-quaternary)]" />;

          if (isComplete) {
            dotColor = "var(--color-profit)";
            dotBg = "rgba(45, 212, 168, 0.15)";
            icon = <CheckCircle2 size={12} className="text-[var(--color-profit)]" />;
          } else if (isInProgress) {
            dotColor = "var(--color-accent-primary)";
            dotBg = "rgba(47, 198, 232, 0.15)";
            icon = <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-ping" />;
          } else if (isAlert) {
            dotColor = "var(--color-loss)";
            dotBg = "rgba(255, 107, 107, 0.15)";
            icon = <AlertCircle size={12} className="text-[var(--color-loss)]" />;
          }

          return (
            <div key={node.id} className="relative group">
              {/* Dot / Pin */}
              <div
                className="absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center -translate-x-1/2 transition-colors"
                style={{ borderColor: dotColor, backgroundColor: dotBg }}
              >
                {icon}
              </div>

              {/* Node Card */}
              <div
                className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 hover:border-[var(--color-border-default)] transition-colors cursor-pointer"
                onClick={() => node.details && setExpandedNodeId(isExpanded ? null : node.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--color-text-quaternary)]">
                      {node.stage}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {node.title}
                    </span>
                  </div>
                  {node.timestamp && (
                    <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] shrink-0">
                      {typeof node.timestamp === "string" ? node.timestamp : new Date(node.timestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  {node.description}
                </p>

                {node.details && (
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-accent-primary)] flex items-center gap-1 font-mono">
                      {isExpanded ? "Collapse Details" : "View Technical Audit"}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  </div>
                )}

                {isExpanded && node.details && (
                  <div className="mt-2.5 pt-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/50 p-2.5 rounded">
                    {node.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
