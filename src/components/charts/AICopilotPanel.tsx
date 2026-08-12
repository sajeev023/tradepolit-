"use client";

import { type RefObject } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  RefreshCw,
  Bot,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  Send,
  Copy,
  Check,
  ChevronDown,
  Clock,
  Bookmark,
  Zap,
  Activity,
  Target,
  Gauge,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { ConfidenceGauge } from "@/components/ui/confidence-gauge";
import { LevelTile } from "@/components/ui/insight-card";
import { StructuredNarrative } from "@/components/ui/structured-narrative";
import { type ChatMessage, type AnalysisPhase, formatMetricNumber } from "@/app/(dashboard)/charts/ChartsClientPage";

// ── Constants ────────────────────────────────────────────────────────────────
// Panel-local copy strings live here so the copilot is self-contained.

const QUICK_ACTIONS = ["Tell me more", "Show entry plan", "Explain the risk", "I'll wait"];

const FOLLOW_UPS = [
  "What's the risk if I enter now?",
  "How does this compare to yesterday's setup?",
  "What would invalidate this trade?",
];

const ANALYSIS_STEPS: { key: AnalysisPhase; label: string }[] = [
  { key: "connecting", label: "Connecting to market feed" },
  { key: "analyzing", label: "Running multi-model analysis" },
];

const COLLAPSE_THRESHOLD = 400;
const COLLAPSE_PREVIEW = 300;

// ── Props ────────────────────────────────────────────────────────────────────

export interface AICopilotPanelProps {
  // Market context
  symbol: string;
  timeframe: string;
  isWebSocketSymbol: boolean;
  isWsDisconnected: boolean;
  /** Live telemetry snapshot — used to show verified levels in the error state. */
  liveIndicators: { support?: number; resistance?: number; bias?: string } | null;

  // Analysis state
  analysisData: any | null;
  isPending: boolean;
  analysisPhase: AnalysisPhase | null;
  analyzeError: Error | null;

  // Chat state
  messages: ChatMessage[];
  inputText: string;
  onInputTextChange: (text: string) => void;
  chatPending: boolean;
  showFollowUps: boolean;
  onDismissFollowUps: () => void;
  expandedMessages: Set<string>;
  onToggleExpand: (id: string) => void;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  bookmarkedIds: Set<string>;
  lastAssistantIndex: number;

  // Scroll infrastructure (owned by parent; threaded through)
  chatInputRef: RefObject<HTMLInputElement | null>;
  chatContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;

  // Actions
  onSendMessage: (e: React.FormEvent) => void;
  onQuickAction: (action: string) => void;
  onAnalyze: () => void;
  onRecalculate: () => void;
  analyzePending: boolean;

  // Entitlements
  subscriptionStatus: string;
  analysisLimit: number | null;
  analysesCountToday: number;
  isDemoMode: boolean;

  // Navigation
  onUpgrade: () => void;
  onOpenHistory: () => void;
  onOpenSaved: () => void;
  onBookmark: (msgId: string, content: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function biasColor(bias: string): string {
  const b = String(bias || "").toUpperCase();
  if (b.includes("BUY") || b.includes("LONG")) return "var(--color-profit)";
  if (b.includes("SELL") || b.includes("SHORT")) return "var(--color-loss)";
  return "var(--color-text-secondary)";
}

interface Status {
  label: string;
  color: string;
  /** A short market-context string shown beside the identity row. */
  watching: string;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * AICopilotPanel — the premium AI trading copilot workspace.
 *
 * Layout contract (predictable height, no clipping, single scroll region):
 *
 *   header   (shrink-0)   — identity + live status + market context
 *   verdict  (shrink-0)   — the hero element, always occupies its slot
 *   scroll   (flex-1)     — single scroll region for analysis detail
 *   suggest  (shrink-0)   — contextual follow-up questions
 *   input    (shrink-0)   — always reachable
 *
 * The verdict never shows fabricated data: real values on results, an honest
 * "analyzing" pulse while loading, a muted placeholder when inactive. This
 * keeps the panel height stable and avoids layout jumps between states.
 */
export function AICopilotPanel(props: AICopilotPanelProps) {
  const {
    symbol,
    timeframe,
    isWebSocketSymbol,
    isWsDisconnected,
    liveIndicators,
    analysisData,
    isPending,
    analysisPhase,
    analyzeError,
    messages,
    inputText,
    onInputTextChange,
    chatPending,
    showFollowUps,
    onDismissFollowUps,
    expandedMessages,
    onToggleExpand,
    copiedId,
    onCopy,
    bookmarkedIds,
    lastAssistantIndex,
    chatInputRef,
    chatContainerRef,
    messagesEndRef,
    onScroll,
    onSendMessage,
    onQuickAction,
    onAnalyze,
    onRecalculate,
    analyzePending,
    subscriptionStatus,
    analysisLimit,
    analysesCountToday,
    isDemoMode,
    onUpgrade,
    onOpenHistory,
    onOpenSaved,
    onBookmark,
  } = props;

  const isPro = subscriptionStatus === "PRO_ACTIVE";
  const atLimit = analysisLimit !== null && analysesCountToday >= analysisLimit;
  const hasResult = !!analysisData && !isPending;
  const hasError = !!analyzeError && !isPending;
  const connectionLabel = isWebSocketSymbol && !isWsDisconnected ? "WS LIVE" : isWebSocketSymbol && isWsDisconnected ? "REST FALLBACK" : "REST";
  const connectionColor = isWebSocketSymbol && !isWsDisconnected ? "var(--color-profit)" : "var(--color-warning)";

  // ── Resolve the live AI status (honest, never fabricated) ────────────────
  const aiStatus: Status = isPending
    ? { label: "Analyzing", color: "var(--color-accent-primary)", watching: `${symbol} · ${timeframe}` }
    : hasError
      ? { label: "Unavailable", color: "var(--color-loss)", watching: `${symbol} · ${timeframe}` }
      : hasResult
        ? { label: "Ready", color: "var(--color-profit)", watching: `${symbol} · ${timeframe}` }
        : { label: "Watching", color: "var(--color-text-quaternary)", watching: `${symbol} · ${timeframe}` };

  // ── Verdict hero values ──────────────────────────────────────────────────
  const bias = analysisData?.bias || "—";
  const setup = analysisData?.setupQuality || "—";
  const confidence = analysisData?.confidence ?? "—";
  const supportVal = analysisData?.support || analysisData?.levels?.support;
  const resistanceVal = analysisData?.resistance || analysisData?.levels?.resistance;
  const invalidationVal = analysisData?.invalidationLevel || analysisData?.levels?.invalidations;

  return (
    <div id="ai-copilot-panel" className="card flex flex-col overflow-hidden h-full min-h-0 min-w-0">

      {/* ── 1. HEADER — identity + live status + market context (shrink-0) ─── */}
      <div className="px-3.5 pt-2.5 pb-2 border-b border-[var(--color-border-subtle)] shrink-0 bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-[var(--color-accent-primary-muted)] shrink-0" style={{ border: "1px solid rgba(6,182,212,0.12)" }}>
              <BrainCircuit size={13} style={{ color: "var(--color-accent-primary)" }} />
            </div>
            <span className="text-[13px] font-bold tracking-tight text-[var(--color-text-primary)]">TradCopilot</span>
            {/* Live status — honest label, pulses only while analyzing */}
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide" style={{ color: aiStatus.color }}>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {isPending && (
                  <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ backgroundColor: aiStatus.color, opacity: 0.6 }} />
                )}
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: aiStatus.color }} />
              </span>
              {aiStatus.label}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => {
                if (isPro) onOpenHistory();
                else toast.error("Upgrade to PRO to access Chat History!");
              }}
              className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-all text-[var(--color-text-tertiary)] cursor-pointer"
              title="Chat History"
            >
              <Clock size={12} />
            </button>
            <button
              onClick={() => {
                if (isPro) onOpenSaved();
                else toast.error("Upgrade to PRO to access Bookmarked analyses!");
              }}
              className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-all text-[var(--color-text-tertiary)] cursor-pointer"
              title="Saved Analyses"
            >
              <Bookmark size={12} />
            </button>
            <button
              onClick={onRecalculate}
              disabled={analyzePending}
              className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-all text-[var(--color-text-tertiary)] cursor-pointer disabled:opacity-40"
              title="Recalculate Chart Analysis"
            >
              <RefreshCw size={12} className={analyzePending ? "animate-spin" : ""} style={analyzePending ? { color: "var(--color-accent-primary)" } : undefined} />
            </button>
          </div>
        </div>
        {/* Market context row — always visible so the user knows what is being watched */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono mt-1 text-[var(--color-text-quaternary)]">
          <span className="text-[var(--color-text-tertiary)]">{symbol}</span>
          <span>·</span>
          <span>{timeframe}</span>
          <span>·</span>
          <span style={{ color: connectionColor }}>{connectionLabel}</span>
        </div>
      </div>

      {/* ── 2. VERDICT HERO — the strongest element (shrink-0) ────────────────
          Bias dominates; Setup and Confidence are secondary. The same grid
          occupies its slot in every state to avoid layout jumps. */}
      <div className="shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
        <div className="px-3.5 py-3">
          {/* Section label */}
          <div className="flex items-center gap-1.5 mb-2">
            <Target size={10} className="text-[var(--color-accent-primary)]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">Market Verdict</span>
            {hasResult && (
              <span className="text-[8px] font-mono text-[var(--color-text-quaternary)] ml-auto">
                {analysisData.cached ? "cached" : "live"}
              </span>
            )}
          </div>

          {hasResult ? (
            /* Real verdict — Bias is the hero (full width, large), Setup + Confidence secondary */
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] relative overflow-hidden"
              >
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r" style={{ backgroundColor: biasColor(bias) }} />
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">Bias</span>
                <span className="font-bold text-sm" style={{ color: biasColor(bias) }}>{bias}</span>
              </motion.div>
              <div className="grid grid-cols-2 gap-2">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                  className="flex flex-col items-center p-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)]"
                >
                  <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">Setup</span>
                  <span className="font-bold text-xs text-[var(--color-text-primary)] mt-0.5">{setup}</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="flex flex-col items-center p-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)]"
                >
                  <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold mb-0.5">Confidence</span>
                  <ConfidenceGauge value={typeof confidence === "string" ? confidence : "—"} delay={0.15} />
                </motion.div>
              </div>
            </div>
          ) : (
            /* Honest placeholder — same slot, muted. Thinking dots while analyzing. */
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] opacity-60">
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">Bias</span>
                <div className="h-3.5 flex items-center">
                  {isPending ? (
                    <span className="flex items-center gap-1"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-quaternary)]">—</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Setup", "Confidence"].map((label) => (
                  <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] opacity-60">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-bold">{label}</span>
                    <div className="h-3.5 flex items-center mt-0.5">
                      {isPending ? (
                        <span className="flex items-center gap-1"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. SCROLLABLE ANALYSIS — single scroll region (flex-1) ───────────
          Contains: key levels, why it matters, near-term scenario, and the
          full AI narrative. Only this region scrolls. */}
      <div
        ref={chatContainerRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3 bg-[var(--color-bg-primary)] custom-scrollbar"
      >
        {/* ── 3a. INACTIVE STATE ─────────────────────────────────────────── */}
        {!analysisData && !isPending && !hasError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 border border-dashed border-cyan-500/30"
              style={{ background: "linear-gradient(135deg, var(--color-accent-primary-subtle), var(--color-bg-tertiary))" }}
            >
              <Bot size={18} className="text-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] mb-1">Chart Analysis Inactive</h3>
            <p className="text-[10px] leading-relaxed text-[var(--color-text-tertiary)] max-w-[220px] mb-4">
              Launch TradCopilot AI to scan indicators, levels, and momentum for this chart.
            </p>
            {!isPro && analysisLimit !== null && atLimit ? (
              <button onClick={onUpgrade} className="btn-primary bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs w-full max-w-[180px] shadow-md cursor-pointer font-bold flex items-center justify-center gap-1.5">
                <Zap size={13} className="fill-zinc-950 text-zinc-950" /> Upgrade to Pro
              </button>
            ) : (
              <button onClick={onAnalyze} className="btn-primary text-xs w-full max-w-[180px] shadow-md cursor-pointer press-scale">
                <Sparkles size={14} /> Analyze Chart
              </button>
            )}
          </div>
        )}

        {/* ── 3b. ANALYZING STATE — premium, honest, structure-preserving ──── */}
        {isPending && (
          <div className="space-y-4 animate-fade-in">
            {/* Market context header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                <span style={{ color: "var(--color-text-primary)" }}>{symbol}</span>
                <span style={{ color: "var(--color-text-quaternary)" }}>·</span>
                <span>{timeframe}</span>
                <span style={{ color: "var(--color-text-quaternary)" }}>·</span>
                <span style={{ color: connectionColor }}>{connectionLabel}</span>
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.12em] uppercase"
                style={{ color: "var(--color-accent-primary)", background: "var(--color-accent-primary-muted)" }}
              >
                <span className="flex items-center gap-0.5">
                  <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
                </span>
                Analyzing
              </span>
            </div>

            {/* Real phase stepper — reflects actual fetch boundaries, never faked */}
            <div className="space-y-1.5">
              {(() => {
                const currentIndex = analysisPhase ? ANALYSIS_STEPS.findIndex((s) => s.key === analysisPhase) : -1;
                return ANALYSIS_STEPS.map((step, i) => {
                  const isDone = currentIndex > i;
                  const isActive = currentIndex === i;
                  return (
                    <div
                      key={step.key}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors duration-200"
                      style={{
                        borderColor: isActive ? "var(--color-border-active)" : isDone ? "var(--color-border-default)" : "transparent",
                        background: isActive ? "var(--color-accent-primary-subtle)" : "transparent",
                      }}
                    >
                      <span
                        className="flex items-center justify-center w-4 h-4 rounded-full shrink-0"
                        style={{ background: isDone ? "var(--color-profit)" : isActive ? "var(--color-accent-primary)" : "var(--color-bg-hover)" }}
                      >
                        {isDone ? <Check size={10} color="#030712" strokeWidth={3} /> : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#030712" }} />
                        ) : (
                          <span className="w-1 h-1 rounded-full" style={{ background: "var(--color-text-quaternary)" }} />
                        )}
                      </span>
                      <span className="text-[11px]" style={{ color: isActive ? "var(--color-text-primary)" : isDone ? "var(--color-text-secondary)" : "var(--color-text-quaternary)", fontWeight: 500 }}>
                        {step.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Subtle progress shimmer — one elegant bar, not skeleton rectangles */}
            <div className="rounded-lg overflow-hidden h-1 bg-[var(--color-bg-tertiary)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--color-accent-primary), #22d3ee)" }}
                initial={{ width: "10%" }}
                animate={{ width: analysisPhase === "analyzing" ? "75%" : "35%" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-quaternary)] leading-relaxed">
              {analysisPhase === "analyzing"
                ? "Synthesizing indicator alignment, key levels, and momentum into a trade context…"
                : "Reading market structure and pulling a live telemetry snapshot…"}
            </p>
          </div>
        )}

        {/* ── 3c. ERROR / OFFLINE STATE — beautiful failure ───────────────── */}
        {hasError && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col items-center text-center pt-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 border border-rose-500/20 bg-rose-500/5">
                <WifiOff size={18} className="text-rose-400" />
              </div>
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] mb-1">AI Analysis Unavailable</h3>
              <p className="text-[10px] leading-relaxed text-[var(--color-text-tertiary)] max-w-[230px] mb-4">
                TradCopilot could not complete this analysis. Verified market data is shown below.
              </p>
              <button onClick={onAnalyze} className="btn-secondary text-xs gap-2 px-4 py-2 rounded-lg cursor-pointer press-scale">
                <RotateCcw size={13} /> Try Again
              </button>
            </div>

            {/* Verified market telemetry fallback */}
            {liveIndicators && (liveIndicators.support || liveIndicators.resistance) && (
              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Activity size={9} className="text-[var(--color-accent-primary)]" /> Verified Levels
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-[9px] text-[var(--color-profit)] block">Support</span>
                    <span className="text-[var(--color-text-primary)]">{liveIndicators.support ? `$${liveIndicators.support.toLocaleString()}` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--color-loss)] block">Resistance</span>
                    <span className="text-[var(--color-text-primary)]">{liveIndicators.resistance ? `$${liveIndicators.resistance.toLocaleString()}` : "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3d. RESULT — key levels, why it matters, scenario, narrative ── */}
        {hasResult && (
          <>
            {/* Key Levels — compact, color-coded row (no heavy card border) */}
            {(supportVal || resistanceVal || invalidationVal) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-2.5"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Gauge size={10} className="text-[var(--color-accent-primary)]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">Key Levels</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <LevelTile label="Support" value={formatMetricNumber(supportVal)} color="profit" source={analysisData.sourceMetadata?.supportSource} delay={0.12} />
                  <LevelTile label="Resistance" value={formatMetricNumber(resistanceVal)} color="loss" source={analysisData.sourceMetadata?.resistanceSource} delay={0.16} />
                  <LevelTile label="Invalidation" value={formatMetricNumber(invalidationVal)} color="warning" source={analysisData.sourceMetadata?.stopLossSource} delay={0.2} />
                </div>
              </motion.div>
            )}

            {/* Why It Matters — left-accent block, quiet */}
            {analysisData.whyItMatters && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
                className="pl-3 border-l-2"
                style={{ borderColor: "rgba(6,182,212,0.4)" }}
              >
                <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-tertiary)] flex items-center gap-1.5 mb-1">
                  <Target size={10} className="text-[var(--color-accent-primary)]" /> Why It Matters
                </span>
                <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{analysisData.whyItMatters}</p>
              </motion.div>
            )}

            {/* Near-Term Scenario — left-accent block, quiet */}
            {analysisData.shortTermScenario && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
                className="pl-3 border-l-2"
                style={{ borderColor: "rgba(6,182,212,0.4)" }}
              >
                <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-text-tertiary)] flex items-center gap-1.5 mb-1">
                  <Activity size={10} className="text-[var(--color-accent-primary)]" /> Near-Term Scenario
                </span>
                <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{analysisData.shortTermScenario}</p>
              </motion.div>
            )}

            {/* Source provenance — subtle, never competing */}
            {analysisData.sourceMetadata?.aiModelSource && (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-quaternary)] pt-0.5">
                <TrendingUp size={9} />
                <span className="truncate">{analysisData.sourceMetadata.aiModelSource}</span>
              </div>
            )}

            {/* ── AI NARRATIVE MESSAGES ──────────────────────────────────── */}
            {messages.length > 0 && (
              <div className="space-y-4 pt-1">
                {messages.map((msg, index) => {
                  // Alert bubble
                  if (msg.isAlert) {
                    const [title, ...rest] = msg.content.split(" — ");
                    return (
                      <div key={msg.id || index} className="p-3 rounded-lg border flex items-start gap-2.5 animate-message-in" style={{ backgroundColor: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.15)" }}>
                        <AlertTriangle className="text-[var(--color-accent-primary)] shrink-0 mt-0.5" size={14} />
                        <div className="text-[12px] leading-relaxed text-[var(--color-text-primary)] font-sans">
                          <span className="font-bold text-[var(--color-accent-primary)]">{title}</span>
                          {rest.length > 0 && <span className="text-[var(--color-text-secondary)]"> — {rest.join(" — ")}</span>}
                        </div>
                      </div>
                    );
                  }

                  // AI message
                  if (msg.role === "assistant") {
                    const msgId = msg.id || String(index);
                    const isLong = msg.content.length > COLLAPSE_THRESHOLD;
                    const isExpanded = expandedMessages.has(msgId);
                    const display = isLong && !isExpanded && !msg.isStreaming ? msg.content.slice(0, COLLAPSE_PREVIEW) + "..." : msg.content;
                    const isLast = index === lastAssistantIndex;

                    return (
                      <div key={msgId} className="flex items-start gap-2.5 animate-message-in">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: "var(--color-accent-primary-subtle)", border: "1px solid rgba(6,182,212,0.1)" }}>
                          <Bot size={13} style={{ color: "var(--color-accent-primary)" }} />
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          {msg.isStreaming ? (
                            <div className="text-[14px] leading-[1.6] text-[var(--color-text-primary)] whitespace-pre-line font-sans break-words">
                              {display}<span className="cursor-blink" />
                            </div>
                          ) : (
                            <StructuredNarrative text={msg.content} />
                          )}
                          {isLong && !msg.isStreaming && (
                            <button onClick={() => onToggleExpand(msgId)} className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] transition-colors">
                              <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                              {isExpanded ? "Hide details" : "Show full analysis"}
                            </button>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Bookmark */}
                              {analysisData && (
                                <button
                                  onClick={() => onBookmark(msgId, msg.content)}
                                  className={`flex items-center gap-1 text-[10px] transition-colors px-1.5 py-0.5 rounded hover:bg-amber-500/10 ${
                                    bookmarkedIds.has(msgId) ? "text-amber-400 font-semibold" : "text-[var(--color-text-tertiary)] hover:text-amber-400"
                                  }`}
                                  title="Bookmark this analysis"
                                >
                                  {bookmarkedIds.has(msgId) ? <Check size={11} className="text-emerald-400" /> : <Bookmark size={11} />}
                                  <span>{bookmarkedIds.has(msgId) ? "Saved" : "Save"}</span>
                                </button>
                              )}
                              {/* Copy */}
                              <button
                                onClick={() => onCopy(msg.content, msgId)}
                                className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-cyan-500/5"
                                aria-label="Copy message"
                              >
                                {copiedId === msgId
                                  ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                                  : <><Copy size={11} /><span>Copy</span></>}
                              </button>
                            </div>
                          </div>
                          {isLast && !msg.isStreaming && !chatPending && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {QUICK_ACTIONS.map((action) => (
                                <button key={action} onClick={() => onQuickAction(action)} className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-150 press-scale">
                                  {action}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // User message
                  return (
                    <div key={msg.id || index} className="flex flex-col items-end gap-1 ml-auto max-w-[85%] animate-message-in">
                      <div className="p-3 border text-[13px] leading-relaxed font-sans" style={{ backgroundColor: "var(--color-accent-primary-subtle)", borderColor: "rgba(6,182,212,0.2)", borderRadius: "12px 12px 4px 12px", color: "var(--color-text-primary)" }}>
                        {msg.content}
                      </div>
                      <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono pr-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}

                {/* Streaming dots for follow-up chat */}
                {chatPending && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: "var(--color-accent-primary-subtle)", border: "1px solid rgba(6,182,212,0.1)" }}>
                      <Bot size={13} style={{ color: "var(--color-accent-primary)" }} />
                    </div>
                    <div className="flex items-center gap-2.5 py-2 select-none">
                      <div className="flex items-center gap-1"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></div>
                      <span className="text-[11px] text-[var(--color-text-tertiary)] font-sans">Analyzing…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 4. SUGGESTED QUESTIONS — contextual actions (shrink-0) ──────────── */}
      {showFollowUps && hasResult && !chatPending && (
        <div className="px-3.5 pt-2 pb-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={9} className="text-[var(--color-accent-primary)]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)]">Suggested</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FOLLOW_UPS.map((q) => (
              <button
                key={q}
                onClick={() => { onInputTextChange(q); onDismissFollowUps(); }}
                className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-150 active:scale-95 max-w-full truncate"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. CHAT INPUT — integrated, always reachable (shrink-0) ────────────
          This single input serves both desktop and mobile. The parent no longer
          renders a separate mobile composer, so there is never a duplicated input. */}
      <div className="border-t bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] shrink-0">
        <div className="p-3 pt-2">
          {/* Quota indicator */}
          {!isPro && analysisLimit !== null && (
            <div className="flex items-center gap-2 mb-1.5 px-0.5 select-none">
              <span className={`text-[9px] font-mono font-bold ${atLimit ? "text-rose-400" : "text-amber-400/80"}`}>
                {Math.max(0, analysisLimit - analysesCountToday)}/{analysisLimit}
              </span>
              {atLimit && (
                <button onClick={onUpgrade} className="text-[9px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2">Upgrade</button>
              )}
            </div>
          )}

          {analysisData ? (
            <form onSubmit={onSendMessage} className="relative flex items-center h-[42px] rounded-lg border bg-[var(--color-bg-tertiary)] border-[var(--color-border-default)] focus-within:border-[var(--color-border-active)] focus-within:shadow-[0_0_0_1px_rgba(6,182,212,0.15)] transition-all">
              <input
                ref={chatInputRef}
                type="text"
                value={inputText}
                onChange={(e) => onInputTextChange(e.target.value)}
                placeholder="Ask about your chart, journal a trade, or get coaching..."
                className="flex-grow bg-transparent border-none outline-none text-sm px-3.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] h-full"
                disabled={chatPending || isPending}
              />
              <div className="flex items-center gap-2 pr-2.5 shrink-0">
                <span className="hidden sm:inline-block text-[10px] font-mono text-[var(--color-text-quaternary)] bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded select-none">⌘↵</span>
                <button
                  type="submit"
                  disabled={!inputText.trim() || chatPending || isPending}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={onAnalyze}
              disabled={isPending}
              className="btn-secondary w-full text-xs flex justify-center items-center gap-2 py-2.5 rounded-lg cursor-pointer border-[var(--color-border-default)] press-scale"
            >
              <RefreshCw size={14} className={analyzePending ? "animate-spin" : ""} style={{ color: "var(--color-accent-primary)" }} />
              Run Chart Technical Scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
