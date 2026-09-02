"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  RefreshCw,
  Bookmark,
  Clock,
  X,
  Send,
  Bot,
  ChevronDown,
  Copy,
  Check,
  Target,
  Activity,
  Gauge,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { PriceData } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isAlert?: boolean;
  isStreaming?: boolean;
}

interface TradCopilotPanelProps {
  symbol: string;
  timeframe: string;
  priceData?: PriceData | null;
  liveIndicators?: any | null;
  wsStatus?: "connected" | "disconnected" | "reconnecting" | "error";
  isWebSocketSymbol?: boolean;
  analysisData?: any | null;
  analysisError?: string | null;
  isPending?: boolean;
  analysisPhase?: "connecting" | "analyzing" | null;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (s: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  onRunAnalysis: (opts?: { bypassCache?: boolean }) => void;
  onDismissError: () => void;
  onOpenSavedAnalyses: () => void;
  onOpenChatHistory: () => void;
  onClose?: () => void;
  subscriptionStatus: string;
  analysisLimit: number | null;
  analysesCountToday: number;
  isDemoMode: boolean;
  showFollowUps: boolean;
  chatMutationPending: boolean;
  isMobile: boolean;
  copiedId: string | null;
  bookmarkedIds: Set<string>;
  expandedMessages: Set<string>;
  onCopy: (content: string, id: string) => void;
  onToggleExpand: (id: string) => void;
  onBookmarkMessage: (msg: ChatMessage, msgId: string) => void;
  onQuickAction: (action: string) => void;
  /** V2: save the current validated analysis as a monitored thesis. */
  onSaveThesis: () => void;
  thesisSaving?: boolean;
  thesisSaved?: boolean;
}

const COLLAPSE_THRESHOLD = 400;
const COLLAPSE_PREVIEW = 300;

const ANALYSIS_STEPS: { key: "connecting" | "analyzing"; label: string }[] = [
  { key: "connecting", label: "Fetching market feed" },
  { key: "analyzing", label: "Running multi-model analysis" },
];

const QUICK_ACTIONS = ["Tell me more", "Show entry plan", "Explain the risk", "I'll wait"];
const FOLLOW_UPS = [
  "What's the risk if I enter now?",
  "How does this compare to yesterday's setup?",
  "What would invalidate this trade?",
];

function formatMetricNumber(val: any, symbol?: string, decimals = 2): string {
  if (val === null || val === undefined) return "—";
  const cleaned = typeof val === "string" ? val.replace(/[^0-9.-]/g, "") : val;
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return "—";
  const quote = symbol?.includes("/") ? symbol.split("/")[1] : "USD";
  const isForex = !!symbol && symbol.includes("/") && !symbol.startsWith("XAU") && !symbol.startsWith("XAG");
  // Only apply forex precision to small-ticket pairs. Crypto (BTC, ETH, SOL)
  // trades at thousands of dollars per unit and should use the caller-supplied
  // decimals instead of 5-decimal forex formatting.
  if (isForex && num < 1000) {
    const fxDecimals = quote === "JPY" ? 3 : 5;
    return num.toLocaleString("en-US", { minimumFractionDigits: fxDecimals, maximumFractionDigits: fxDecimals });
  }
  const prefix = quote === "USD" ? "$" : "";
  return `${prefix}${num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatPriceDisplay(symbol: string, price?: number): string {
  if (price === undefined || price === null || isNaN(price)) return "—";
  return formatMetricNumber(price, symbol, price >= 1000 ? 0 : price >= 1 ? 2 : 4);
}

function classNames(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function StatusChip({
  dot = "green",
  pulse = false,
  children,
}: {
  dot?: "green" | "red" | "amber" | "accent" | "muted";
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const dotClass = {
    green: "bg-[var(--color-profit)] shadow-[0_0_0_3px_rgba(var(--green-rgb),0.16)]",
    red: "bg-[var(--color-loss)] shadow-[0_0_0_3px_rgba(var(--red-rgb),0.16)]",
    amber: "bg-[var(--color-warning)] shadow-[0_0_0_3px_rgba(var(--amber-rgb),0.16)]",
    accent: "bg-[var(--color-accent-primary)] shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.16)]",
    muted: "bg-[var(--color-text-quaternary)]",
  }[dot];

  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.02em] text-[var(--color-text-tertiary)]">
      <span className={classNames("w-1.5 h-1.5 rounded-full shrink-0", pulse && "animate-pulse", dotClass)} />
      <span>{children}</span>
    </div>
  );
}

function Badge({
  variant = "neutral",
  pulse = false,
  children,
}: {
  variant?: "neutral" | "accent" | "green" | "amber" | "red";
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "text-[var(--color-text-secondary)] bg-[var(--color-bg-hover)] border-[var(--color-border-default)]",
    accent:
      "text-[var(--color-accent-primary)] bg-[rgba(var(--accent-rgb),0.08)] border-[rgba(var(--accent-rgb),0.22)]",
    green:
      "text-[var(--color-profit)] bg-[rgba(var(--green-rgb),0.08)] border-[rgba(var(--green-rgb),0.22)]",
    amber:
      "text-[var(--color-warning)] bg-[rgba(var(--amber-rgb),0.08)] border-[rgba(var(--amber-rgb),0.22)]",
    red: "text-[var(--color-loss)] bg-[rgba(var(--red-rgb),0.08)] border-[rgba(var(--red-rgb),0.22)]",
  }[variant];

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.08em] uppercase border",
        pulse && "animate-pulse",
        styles,
      )}
    >
      {children}
    </span>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] font-semibold tracking-[0.08em] uppercase text-[var(--color-text-tertiary)]">
      {children}
    </span>
  );
}

function Hairline() {
  return <div className="h-px bg-[var(--color-border-subtle)]" />;
}

function MetricValue({
  children,
  color = "primary",
}: {
  children: React.ReactNode;
  color?: "primary" | "profit" | "loss" | "warning" | "accent";
}) {
  const colorClass = {
    primary: "text-[var(--color-text-primary)]",
    profit: "text-[var(--color-profit)]",
    loss: "text-[var(--color-loss)]",
    warning: "text-[var(--color-warning)]",
    accent: "text-[var(--color-accent-primary)]",
  }[color];

  return <span className={classNames("font-mono text-[13px] font-semibold tabular-nums tracking-tight", colorClass)}>{children}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function PanelHeader({
  isPro,
  onOpenSavedAnalyses,
  onOpenChatHistory,
  onRunAnalysis,
  onClose,
  isPending,
  wsStatus,
  isWebSocketSymbol,
}: {
  isPro: boolean;
  onOpenSavedAnalyses: () => void;
  onOpenChatHistory: () => void;
  onRunAnalysis: () => void;
  onClose?: () => void;
  isPending: boolean;
  wsStatus?: "connected" | "disconnected" | "reconnecting" | "error";
  isWebSocketSymbol?: boolean;
}) {
  const marketStatus: { dot: "green" | "amber" | "red" | "accent"; pulse: boolean; label: string } =
    !isWebSocketSymbol
      ? { dot: "accent", pulse: false, label: "REST feed" }
      : wsStatus === "connected"
      ? { dot: "green", pulse: true, label: "Market connected" }
      : wsStatus === "reconnecting"
      ? { dot: "amber", pulse: true, label: "Reconnecting" }
      : { dot: "red", pulse: false, label: "Market offline" };

  return (
    <div className="flex items-center justify-between px-3 border-b shrink-0 h-[38px] border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-[var(--color-accent-primary-muted)] border border-[rgba(var(--accent-rgb),0.12)] shrink-0">
          <BrainCircuit size={15} className="text-[var(--color-accent-primary)]" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-bold tracking-tight text-[var(--color-text-primary)] truncate leading-none">
            TradCopilot
          </span>
          <span className="text-[9px] text-[var(--color-text-quaternary)] truncate leading-tight hidden sm:block">
            AI Market Intelligence
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="hidden sm:flex items-center mr-1">
          <StatusChip dot={marketStatus.dot} pulse={marketStatus.pulse}>{marketStatus.label}</StatusChip>
        </div>
        <button
          onClick={onOpenSavedAnalyses}
          className="icon-button text-[var(--color-text-tertiary)] hover:text-[var(--color-warning)]"
          title={isPro ? "Saved Analyses" : "Upgrade to PRO to save analyses"}
        >
          <Bookmark size={13} />
        </button>
        <button
          onClick={onOpenChatHistory}
          className="icon-button text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)]"
          title={isPro ? "Chat History" : "Upgrade to PRO for chat history"}
        >
          <Clock size={13} />
        </button>
        <button
          onClick={onRunAnalysis}
          disabled={isPending}
          className="icon-button text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          title="Recalculate analysis"
        >
          <RefreshCw size={13} className={isPending ? "animate-spin text-[var(--color-accent-primary)]" : ""} />
        </button>
        {onClose && (
          <button onClick={onClose} className="icon-button text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] lg:hidden">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Context
// ─────────────────────────────────────────────────────────────────────────────

function MarketContext({
  symbol,
  timeframe,
  priceData,
  liveIndicators,
}: {
  symbol: string;
  timeframe: string;
  priceData?: PriceData | null;
  liveIndicators?: any | null;
}) {
  const price = liveIndicators?.currentPrice ?? priceData?.price;
  const change = priceData?.changePercent24h;

  return (
    <div className="px-3 py-2.5 border-b border-[var(--color-border-subtle)] shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)] truncate">{symbol}</span>
          <span className="text-[var(--color-text-quaternary)]">·</span>
          <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">{timeframe}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MetricValue color={change === undefined ? "primary" : change >= 0 ? "profit" : "loss"}>
            {formatPriceDisplay(symbol, price)}
          </MetricValue>
          {change !== undefined && (
            <span
              className={classNames(
                "inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold",
                change >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]",
              )}
            >
              {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Status
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisStatus({
  isPending,
  analysisPhase,
  analysisError,
  analysisData,
  chatMutationPending,
  messages,
}: {
  isPending: boolean;
  analysisPhase?: "connecting" | "analyzing" | null;
  analysisError?: string | null;
  analysisData?: any | null;
  chatMutationPending: boolean;
  messages: ChatMessage[];
}) {
  const isStreaming = messages.some(m => m.role === "assistant" && m.isStreaming);

  let badge: { variant: "neutral" | "accent" | "green" | "amber" | "red"; pulse: boolean; label: string };

  if (analysisError) {
    badge = { variant: "amber", pulse: false, label: "Analysis unavailable" };
  } else if (isPending && analysisPhase === "connecting") {
    badge = { variant: "accent", pulse: true, label: "Fetching market feed" };
  } else if (isPending && analysisPhase === "analyzing") {
    badge = { variant: "accent", pulse: true, label: "Analyzing chart" };
  } else if (isStreaming) {
    badge = { variant: "accent", pulse: true, label: "Reading market structure" };
  } else if (chatMutationPending) {
    badge = { variant: "accent", pulse: true, label: "Answering" };
  } else if (analysisData && !analysisData.loading) {
    badge = { variant: "green", pulse: false, label: "Analysis complete" };
  } else {
    badge = { variant: "neutral", pulse: false, label: "Ready" };
  }

  return (
    <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] shrink-0 flex items-center justify-between gap-2">
      <Badge variant={badge.variant} pulse={badge.pulse}>{badge.label}</Badge>
      {analysisPhase && isPending && (
        <span className="font-mono text-[9px] text-[var(--color-text-quaternary)] uppercase tracking-wider">
          {analysisPhase === "connecting" ? "Step 1 / 2" : "Step 2 / 2"}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error State (compact)
// ─────────────────────────────────────────────────────────────────────────────

function ErrorState({
  error,
  onRetry,
  onDismiss,
}: {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const isContradiction = error.startsWith("AI trade analysis contained internal logical contradictions");
  const prefix = "AI trade analysis contained internal logical contradictions:";
  const issues = isContradiction
    ? error
        .slice(prefix.length)
        .split(";")
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-[var(--color-warning-bg)] border-[rgba(var(--amber-rgb),0.22)]">
        <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-snug">
            Analysis temporarily unavailable
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">
            {isContradiction
              ? "The model's response failed internal validation. Re-run to regenerate it."
              : "The analysis engine returned an error for this symbol/timeframe."}
          </p>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] p-2 max-h-[120px] overflow-y-auto custom-scrollbar">
          <ul className="space-y-1">
            {issues.map((iss, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[10px] font-mono leading-relaxed text-[var(--color-text-secondary)]"
              >
                <span className="text-[var(--color-warning)] mt-px shrink-0">•</span>
                <span>{iss}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isContradiction && (
        <p className="text-[10px] font-mono leading-relaxed text-[var(--color-text-secondary)]">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button onClick={onRetry} className="btn-primary btn-sm flex-1 flex items-center justify-center gap-1.5">
          <RefreshCw size={13} /> Retry analysis
        </button>
        <button onClick={onDismiss} className="btn-ghost btn-sm text-[var(--color-text-tertiary)]">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading State
// ─────────────────────────────────────────────────────────────────────────────

function LoadingState({ analysisPhase }: { analysisPhase?: "connecting" | "analyzing" | null }) {
  const currentIndex = analysisPhase ? ANALYSIS_STEPS.findIndex(s => s.key === analysisPhase) : -1;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {ANALYSIS_STEPS.map((step, i) => {
          const isDone = currentIndex > i;
          const isActive = currentIndex === i;
          return (
            <div
              key={step.key}
              className={classNames(
                "flex items-center gap-2.5 px-3 py-2 rounded-md border transition-colors duration-200",
                isActive && "bg-[var(--color-accent-primary-subtle)] border-[var(--color-border-active)]",
                isDone && "border-[var(--color-border-default)]",
                !isActive && !isDone && "border-transparent",
              )}
            >
              <span
                className={classNames(
                  "flex items-center justify-center w-4 h-4 rounded-full shrink-0",
                  isDone && "bg-[var(--color-profit)]",
                  isActive && "bg-[var(--color-accent-primary)]",
                  !isActive && !isDone && "bg-[var(--color-bg-hover)]",
                )}
              >
                {isDone ? (
                  <Check size={10} color="#030712" strokeWidth={3} />
                ) : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#030712]" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-[var(--color-text-quaternary)]" />
                )}
              </span>
              <span
                className={classNames(
                  "text-[11px] font-medium",
                  isActive && "text-[var(--color-text-primary)]",
                  isDone && "text-[var(--color-text-secondary)]",
                  !isActive && !isDone && "text-[var(--color-text-quaternary)]",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Idle State
// ─────────────────────────────────────────────────────────────────────────────

function IdleState({ symbol, timeframe, onAnalyze }: { symbol: string; timeframe: string; onAnalyze: () => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Run a technical scan</p>
        <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
          Launch a multi-model analysis to see the market read, key levels, and a coaching note for{" "}
          <span className="font-mono text-[var(--color-text-secondary)]">
            {symbol} {timeframe}
          </span>
          .
        </p>
      </div>
      <button onClick={onAnalyze} className="btn-primary btn-sm w-full flex items-center justify-center gap-1.5 cursor-pointer">
        <Activity size={14} /> Analyze chart
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success State — Market Read
// ─────────────────────────────────────────────────────────────────────────────

function MarketRead({ analysisData }: { analysisData: any }) {
  const bias = String(analysisData.bias || "—");
  const setup = String(analysisData.setupQuality || "—");
  // V2.5: derived confidence (evidence-based, from the confidence engine)
  // takes precedence over the LLM's self-asserted label — and shows WHY.
  const derived = analysisData.derivedConfidence as
    | { score: number; tier: string; factors?: { name: string; direction: string; note: string }[] }
    | undefined;
  const confidence = derived
    ? derived.tier
    : String(typeof analysisData.confidence === "string" ? analysisData.confidence.split(" ")[0] : analysisData.confidence || "—");

  const biasColor =
    bias.includes("BUY") || bias.includes("LONG") || bias.includes("BULLISH")
      ? "profit"
      : bias.includes("SELL") || bias.includes("SHORT") || bias.includes("BEARISH")
      ? "loss"
      : "primary";

  const regime = analysisData.marketContext?.regime as
    | { regime: string; label: string; reasons?: string[] }
    | undefined;
  const mtf = analysisData.marketContext?.mtf as
    | { alignment: string; views?: { timeframe: string; trend: string }[] }
    | undefined;

  const regimeTone =
    regime?.regime === "TRENDING_UP" || regime?.regime === "BREAKOUT"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : regime?.regime === "TRENDING_DOWN" || regime?.regime === "BREAKDOWN"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : regime?.regime === "HIGH_VOLATILITY" || regime?.regime === "TRANSITIONAL"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-zinc-700 bg-zinc-800/50 text-zinc-300";

  return (
    <div className="space-y-2">
      <MonoLabel>Market Read</MonoLabel>
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <MonoLabel>Bias</MonoLabel>
          <MetricValue color={biasColor as any}>{bias}</MetricValue>
        </div>
        <span className="text-[var(--color-text-quaternary)]">·</span>
        <div>
          <MonoLabel>Setup</MonoLabel>
          <MetricValue color="primary">{setup}</MetricValue>
        </div>
        <span className="text-[var(--color-text-quaternary)]">·</span>
        <div className="group relative">
          <MonoLabel>Confidence {derived ? <span className="text-[8px] text-[var(--color-text-quaternary)]">(evidence-based)</span> : null}</MonoLabel>
          <MetricValue color="primary">{confidence}</MetricValue>
          {/* Evidence factors — WHY this confidence level exists. */}
          {derived?.factors && derived.factors.length > 0 && (
            <div className="absolute left-0 top-full z-30 hidden group-hover:block w-72 pt-2">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/97 backdrop-blur p-3 shadow-xl text-left">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 flex items-center justify-between">
                  <span>Why confidence = {derived.tier}</span>
                  <span className="text-zinc-500 normal-case">score {derived.score}/100</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {derived.factors.map((f, i: number) => (
                    <div key={i} className="text-[11px] leading-snug">
                      <span
                        className={
                          f.direction === "positive"
                            ? "text-emerald-400"
                            : f.direction === "negative"
                              ? "text-red-400"
                              : "text-zinc-400"
                        }
                      >
                        {f.direction === "positive" ? "▲" : f.direction === "negative" ? "▼" : "•"} {f.name}
                      </span>
                      <span className="text-zinc-500"> — {f.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Regime badge + MTF alignment — the deterministic market context,
          previously computed but invisible. */}
      {(regime || mtf) && (
        <div className="flex items-center gap-2 flex-wrap">
          {regime && (
            <span
              title={regime.reasons?.[0] ?? regime.regime}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${regimeTone}`}
            >
              {regime.label}
            </span>
          )}
          {mtf && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                mtf.alignment === "ALIGNED_BULLISH"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : mtf.alignment === "ALIGNED_BEARISH"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
              title={mtf.views?.map((v) => `${v.timeframe}: ${v.trend}`).join(" · ")}
            >
              MTF {mtf.alignment.replace("ALIGNED_", "").toLowerCase()}
              {mtf.views && mtf.views.length > 0 && (
                <span className="text-zinc-400 font-normal">
                  ({mtf.views.map((v) => `${v.timeframe} ${v.trend.toLowerCase()}`).join(" · ")})
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function KeyLevels({ analysisData, symbol }: { analysisData: any; symbol: string }) {
  const support = analysisData.support ?? analysisData.levels?.support;
  const resistance = analysisData.resistance ?? analysisData.levels?.resistance;
  const invalidation = analysisData.invalidationLevel ?? analysisData.levels?.invalidation;

  return (
    <div className="space-y-2">
      <MonoLabel>Key Levels</MonoLabel>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-profit)] font-semibold mb-0.5">Support</div>
          <MetricValue color="profit">{formatMetricNumber(support, symbol)}</MetricValue>
          <div className="text-[9px] text-[var(--color-text-quaternary)] mt-0.5 truncate">
            {analysisData.sourceMetadata?.supportSource || "Swing-low"}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-loss)] font-semibold mb-0.5">Resistance</div>
          <MetricValue color="loss">{formatMetricNumber(resistance, symbol)}</MetricValue>
          <div className="text-[9px] text-[var(--color-text-quaternary)] mt-0.5 truncate">
            {analysisData.sourceMetadata?.resistanceSource || "Swing-high"}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-warning)] font-semibold mb-0.5">Invalidation</div>
          <MetricValue color="warning">{formatMetricNumber(invalidation, symbol)}</MetricValue>
          <div className="text-[9px] text-[var(--color-text-quaternary)] mt-0.5 truncate">
            {analysisData.sourceMetadata?.stopLossSource || "Below support"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V2.5 Risk Guardrails — plan vs the user's own risk profile
// ─────────────────────────────────────────────────────────────────────────────

function RiskGuardrails({ guardrails }: { guardrails: any }) {
  const g = guardrails;
  if (!g) return null;
  const hasWarnings = Array.isArray(g.warnings) && g.warnings.length > 0;
  return (
    <div className="space-y-2">
      <MonoLabel>Risk Guardrails · your profile</MonoLabel>
      <div className="text-[10px] text-[var(--color-text-tertiary)] leading-relaxed space-y-1">
        <div>
          Max loss per trade at your{" "}
          <span className="text-[var(--color-text-secondary)] font-medium">
            ${Number(g.accountSize)?.toLocaleString()} / {Number(g.maxRiskPercent)}%
          </span>{" "}
          profile:{" "}
          <span className="text-[var(--color-text-primary)] font-medium">
            ${Number(g.maxLossAllowed)?.toLocaleString()}
          </span>
          {g.riskPerUnit != null && (
            <>
              {" "}· risk per unit here:{" "}
              <span className="text-[var(--color-text-primary)] font-medium">
                ${Number(g.riskPerUnit)?.toLocaleString()}
              </span>
            </>
          )}
        </div>
        {g.suggestedMaxSize != null && g.suggestedMaxSize > 0 && (
          <div>
            Position size that respects your risk rule:{" "}
            <span className="text-[var(--color-text-primary)] font-medium font-mono">
              {g.suggestedMaxSize.toLocaleString()} units
            </span>{" "}
            max
          </div>
        )}
        {hasWarnings &&
          g.warnings.map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5 text-amber-300/90">
              <span>⚠</span>
              <span>{w}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3 Decision Brief — Evidence block (deterministic, from the context engine)
// ─────────────────────────────────────────────────────────────────────────────

function EvidenceBlock({ evidence }: { evidence: { for?: string[]; against?: string[] } }) {
  const forItems = (evidence.for ?? []).slice(0, 5);
  const againstItems = (evidence.against ?? []).slice(0, 5);
  if (forItems.length === 0 && againstItems.length === 0) return null;
  return (
    <div className="space-y-2">
      <MonoLabel>Evidence · deterministic</MonoLabel>
      <div className="space-y-1.5">
        {forItems.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">Supports the read</div>
            {forItems.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                <span className="text-emerald-400 shrink-0">▲</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}
        {againstItems.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-red-400 font-semibold">Contradicts / risks</div>
            {againstItems.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                <span className="text-red-400 shrink-0">▼</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IndicatorSnapshot({ analysisData }: { analysisData: any }) {
  const rsi = analysisData.indicators?.rsi;
  const macd = analysisData.indicators?.macd;
  const trend = analysisData.trend;

  const hasMacd = macd && (Number(macd.macd) !== 0 || Number(macd.signal) !== 0);
  const macdBullish = hasMacd && Number(macd.macd) >= Number(macd.signal);

  return (
    <div className="space-y-2">
      <MonoLabel>Indicators</MonoLabel>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-semibold mb-0.5">RSI(14)</div>
          <MetricValue
            color={
              Number(rsi) >= 70 ? "warning" : Number(rsi) <= 30 ? "profit" : "primary"
            }
          >
            {rsi !== undefined && !isNaN(Number(rsi)) ? Number(rsi).toFixed(1) : "—"}
          </MetricValue>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-semibold mb-0.5">MACD</div>
          <MetricValue color={!hasMacd ? "primary" : macdBullish ? "profit" : "loss"}>
            {!hasMacd ? "—" : macdBullish ? "Bullish" : "Bearish"}
          </MetricValue>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-semibold mb-0.5">Trend</div>
          <MetricValue
            color={
              trend === "BULLISH" ? "profit" : trend === "BEARISH" ? "loss" : "primary"
            }
          >
            {trend ? trend.charAt(0) + trend.slice(1).toLowerCase() : "Range"}
          </MetricValue>
        </div>
      </div>
    </div>
  );
}

function NarrativeBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <MonoLabel>{title}</MonoLabel>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{children}</p>
    </div>
  );
}

function SourceLine({ analysisData }: { analysisData: any }) {
  if (!analysisData.sourceMetadata?.aiModelSource) return null;
  return (
    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-quaternary)] pt-0.5">
      <Gauge size={10} />
      <span className="truncate">{analysisData.sourceMetadata.aiModelSource}</span>
    </div>
  );
}

function SuccessState({
  analysisData,
  symbol,
  messages,
  onQuickAction,
  onCopy,
  onToggleExpand,
  onBookmarkMessage,
  copiedId,
  bookmarkedIds,
  expandedMessages,
  onSaveThesis,
  thesisSaving,
  thesisSaved,
}: {
  analysisData: any;
  symbol: string;
  messages: ChatMessage[];
  onQuickAction: (action: string) => void;
  onCopy: (content: string, id: string) => void;
  onToggleExpand: (id: string) => void;
  onBookmarkMessage: (msg: ChatMessage, msgId: string) => void;
  copiedId: string | null;
  bookmarkedIds: Set<string>;
  expandedMessages: Set<string>;
  onSaveThesis: () => void;
  thesisSaving?: boolean;
  thesisSaved?: boolean;
}) {
  const lastAssistantIndex = messages.reduceRight(
    (found, msg, idx) => (found === -1 && msg.role === "assistant" ? idx : found),
    -1,
  );

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <MarketRead analysisData={analysisData} />
        <Hairline />
        {/* V3 DECISION BRIEF — the situation in evidence form: what
            supports the read, what contradicts it, all deterministic. */}
        {analysisData.evidence && (analysisData.evidence.for?.length > 0 || analysisData.evidence.against?.length > 0) && (
          <EvidenceBlock evidence={analysisData.evidence} />
        )}
        <Hairline />
        <KeyLevels analysisData={analysisData} symbol={symbol} />
        <Hairline />
        {/* V2.5 pre-trade risk guardrails — the plan checked against the
            user's own risk profile, at decision time. */}
        {analysisData.riskGuardrails && (
          <RiskGuardrails guardrails={analysisData.riskGuardrails} />
        )}
        <Hairline />
        {/* V2: save as monitored thesis — the retention loop entry point.
            Disabled for NEUTRAL/no-trade reads: a thesis requires a
            direction, and the server would reject it anyway (422). */}
        {(() => {
          const plan = analysisData?.tradePlan;
          const directional = !!plan && (plan.direction === "LONG" || plan.direction === "SHORT");
          return (
            <button
              onClick={onSaveThesis}
              disabled={thesisSaving || thesisSaved || !directional}
              title={!directional ? "Bias is NEUTRAL — a thesis requires a LONG or SHORT read" : undefined}
              className={classNames(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                thesisSaved
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : directional
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                    : "bg-zinc-900/50 text-zinc-500 border-zinc-800 cursor-not-allowed"
              )}
            >
              {thesisSaving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300/30 border-t-blue-300" />
              ) : (
                <Target size={13} />
              )}
              {thesisSaved
                ? "Thesis saved — monitoring"
                : directional
                  ? "Save as Thesis — track it"
                  : "No thesis — NEUTRAL read"}
            </button>
          );
        })()}
        <Hairline />
        {analysisData.indicators && <IndicatorSnapshot analysisData={analysisData} />}
        {analysisData.indicators && <Hairline />}
        {analysisData.whyItMatters && (
          <NarrativeBlock title="Why it matters" icon={<Target size={12} className="text-[var(--color-accent-primary)]" />}>
            {analysisData.whyItMatters}
          </NarrativeBlock>
        )}
        {analysisData.shortTermScenario && (
          <NarrativeBlock title="Near-term scenario" icon={<Activity size={12} className="text-[var(--color-accent-primary)]" />}>
            {analysisData.shortTermScenario}
          </NarrativeBlock>
        )}
        {/* V3 Decision Brief — "what happens next": the monitoring
            commitment. Makes the loop's promise explicit at decision
            time. */}
        <NarrativeBlock title="What happens next" icon={<Activity size={12} className="text-[var(--color-accent-primary)]" />}>
          {analysisData.tradePlan ? (
            <>
              Save this as a thesis and TradeCopilot monitors it every 5 minutes against the
              high/low of each candle window — you get notified the moment the target is hit
              or the thesis is invalidated, and the outcome becomes part of your Decision Score.
            </>
          ) : (
            <>
              No directional plan on this read — nothing to monitor. When a setup forms with a
              clear bias, save it as a thesis and tracking begins automatically.
            </>
          )}
        </NarrativeBlock>
        <SourceLine analysisData={analysisData} />
      </motion.div>

      <Hairline />

      {/* Chat / Coaching thread */}
      <div className="space-y-5">
        {messages.map((msg, index) => {
          if (msg.isAlert) {
            const [title, ...rest] = msg.content.split(" — ");
            return (
              <div
                key={msg.id || index}
                className="p-3 rounded-lg border flex items-start gap-3 animate-message-in"
                style={{ backgroundColor: "rgba(var(--accent-rgb), 0.06)", borderColor: "rgba(var(--accent-rgb), 0.15)" }}
              >
                <AlertTriangle className="text-[var(--color-accent-primary)] shrink-0 mt-0.5" size={15} />
                <div className="text-[12px] leading-relaxed text-[var(--color-text-primary)] font-sans">
                  <span className="font-bold text-[var(--color-accent-primary)] block sm:inline">{title}</span>
                  {rest.length > 0 && <span className="text-[var(--color-text-secondary)]"> — {rest.join(" — ")}</span>}
                </div>
              </div>
            );
          }

          if (msg.role === "assistant") {
            const msgId = msg.id || String(index);
            const isLong = msg.content.length > COLLAPSE_THRESHOLD;
            const isExpanded = expandedMessages.has(msgId);
            const display = isLong && !isExpanded && !msg.isStreaming ? msg.content.slice(0, COLLAPSE_PREVIEW) + "..." : msg.content;
            const isLast = index === lastAssistantIndex;

            return (
              <div key={msgId} className="flex items-start gap-3 animate-message-in">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-[rgba(var(--accent-rgb),0.1)] mt-0.5"
                  style={{ backgroundColor: "var(--color-accent-primary-subtle)" }}
                >
                  <Bot size={13} style={{ color: "var(--color-accent-primary)" }} />
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="text-[14px] leading-[1.6] text-[var(--color-text-primary)] whitespace-pre-line font-sans break-words">
                    {display}
                    {msg.isStreaming && <span className="cursor-blink" />}
                  </div>

                  {isLong && !msg.isStreaming && (
                    <button
                      onClick={() => onToggleExpand(msgId)}
                      className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] transition-colors"
                    >
                      <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      {isExpanded ? "Hide details" : "Show full analysis"}
                    </button>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    {!msg.isStreaming && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onBookmarkMessage(msg, msgId)}
                          className={`flex items-center gap-1 text-[10px] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-warning-bg)] ${
                            bookmarkedIds.has(msgId) ? "text-[var(--color-warning)] font-semibold" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-warning)]"
                          }`}
                          title="Bookmark this analysis"
                        >
                          {bookmarkedIds.has(msgId) ? <Check size={11} className="text-[var(--color-profit)]" /> : <Bookmark size={11} />}
                          <span>{bookmarkedIds.has(msgId) ? "Saved" : "Save"}</span>
                        </button>
                        <button
                          onClick={() => onCopy(msg.content, msgId)}
                          className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-accent-primary-subtle)]"
                          aria-label="Copy message"
                        >
                          {copiedId === msgId ? (
                            <>
                              <Check size={11} className="text-[var(--color-profit)]" />
                              <span className="text-[var(--color-profit)]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isLast && !msg.isStreaming && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_ACTIONS.map(action => (
                        <button
                          key={action}
                          onClick={() => onQuickAction(action)}
                          className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[rgba(var(--accent-rgb),0.3)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-subtle)] transition-all duration-150 press-scale"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || index} className="flex flex-col items-end gap-1.5 ml-auto max-w-[80%] animate-message-in">
              <div
                className="p-3 border text-[14px] leading-relaxed font-sans shadow-xs"
                style={{
                  backgroundColor: "var(--color-bg-tertiary)",
                  borderColor: "var(--color-border-default)",
                  borderRadius: "12px 12px 4px 12px",
                  color: "var(--color-text-primary)",
                }}
              >
                {msg.content}
              </div>
              <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono pr-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Action Bar
// ─────────────────────────────────────────────────────────────────────────────

function InputBar({
  inputText,
  setInputText,
  onSendChat,
  analysisData,
  onRunAnalysis,
  isPending,
  chatMutationPending,
  showFollowUps,
  onFollowUp,
  analysisLimit,
  analysesCountToday,
  isDemoMode,
  chatInputRef,
}: {
  inputText: string;
  setInputText: (s: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  analysisData?: any | null;
  onRunAnalysis: () => void;
  isPending: boolean;
  chatMutationPending: boolean;
  showFollowUps: boolean;
  onFollowUp: (q: string) => void;
  analysisLimit: number | null;
  analysesCountToday: number;
  isDemoMode: boolean;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const atLimit = analysisLimit !== null && analysesCountToday >= analysisLimit;
  const remaining = analysisLimit !== null ? Math.max(0, analysisLimit - analysesCountToday) : null;

  return (
    <div className="border-t bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] shrink-0">
      {showFollowUps && analysisData && !chatMutationPending && (
        <div className="px-3 pt-3 pb-1 hidden lg:flex lg:flex-wrap gap-1.5">
          {FOLLOW_UPS.map(q => (
            <button
              key={q}
              onClick={() => onFollowUp(q)}
              className="px-2.5 py-1 rounded-full text-[11px] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[rgba(var(--accent-rgb),0.3)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-subtle)] transition-all duration-150 active:scale-95 max-w-full truncate"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 pt-2.5">
        {analysisLimit !== null && (
          <div className="hidden lg:flex items-center gap-2 mb-1 px-0.5 select-none">
            <span className={`text-[9px] font-mono font-bold ${atLimit ? "text-[var(--color-loss)]" : "text-[var(--color-warning)]"}`}>
              {remaining}/{analysisLimit}
            </span>
            <span className="text-[9px] text-[var(--color-text-quaternary)] font-mono">
              {isDemoMode ? "demo analyses left" : "daily analyses left"}
            </span>
            {atLimit && (
              <Link
                href="/pricing"
                className="text-[9px] font-semibold text-[var(--color-warning)] hover:text-[var(--color-accent-primary)] underline underline-offset-2"
              >
                Upgrade
              </Link>
            )}
          </div>
        )}

        {analysisData ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              onSendChat(e);
            }}
            className="hidden lg:flex relative items-center h-[44px] rounded-lg border bg-[var(--color-bg-tertiary)] border-[var(--color-border-default)]"
          >
            <input
              ref={chatInputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask about your chart, journal a trade, or get coaching..."
              className="flex-grow bg-transparent border-none outline-none text-sm px-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] h-full"
              disabled={chatMutationPending || isPending}
            />
            <div className="flex items-center gap-3 pr-3 shrink-0">
              <span className="hidden sm:inline-block text-[10px] font-mono text-[var(--color-text-quaternary)] bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded select-none">
                ⌘↵
              </span>
              <button
                type="submit"
                disabled={!inputText.trim() || chatMutationPending || isPending}
                className="text-[var(--color-accent-primary)] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer p-1"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={onRunAnalysis}
            disabled={isPending}
            className="btn-secondary w-full text-xs flex justify-center items-center gap-2 py-3 rounded-lg cursor-pointer border-[var(--color-border-default)]"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin text-[var(--color-accent-primary)]" : "text-[var(--color-accent-primary)]"} />
            Run Chart Technical Scan
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TradCopilotPanel({
  symbol,
  timeframe,
  priceData,
  liveIndicators,
  wsStatus = "connected",
  isWebSocketSymbol = true,
  analysisData,
  analysisError,
  isPending = false,
  analysisPhase,
  messages,
  inputText,
  setInputText,
  onSendChat,
  onRunAnalysis,
  onDismissError,
  onOpenSavedAnalyses,
  onOpenChatHistory,
  onClose,
  subscriptionStatus,
  analysisLimit,
  analysesCountToday,
  isDemoMode,
  showFollowUps,
  chatMutationPending,
  isMobile,
  copiedId,
  bookmarkedIds,
  expandedMessages,
  onCopy,
  onToggleExpand,
  onBookmarkMessage,
  onQuickAction,
  onSaveThesis,
  thesisSaving,
  thesisSaved,
}: TradCopilotPanelProps) {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isPro = subscriptionStatus === "PRO_ACTIVE";

  useEffect(() => {
    if (!isMobile) {
      chatInputRef.current?.focus();
    }
  }, [isMobile, analysisData]);

  // Auto-scroll to bottom on new messages / streaming chunks
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }, [messages]);

  // Reset scroll to top when a fresh analysis begins
  useEffect(() => {
    if (isPending && !analysisData) {
      const body = bodyRef.current;
      if (body) body.scrollTop = 0;
    }
  }, [isPending, analysisData]);

  const handleProSavedAnalyses = () => {
    if (isPro) {
      onOpenSavedAnalyses();
    } else {
      toast.error("Upgrade to PRO to access Bookmarked analyses!");
    }
  };

  const handleProChatHistory = () => {
    if (isPro) {
      onOpenChatHistory();
    } else {
      toast.error("Upgrade to PRO to access Chat History!");
    }
  };

  const handleRunAnalysis = () => {
    onRunAnalysis({ bypassCache: true });
  };

  const handleInitialAnalyze = () => {
    onRunAnalysis({ bypassCache: false });
  };

  const handleFollowUp = (q: string) => {
    setInputText(q);
  };

  return (
    <div className="card flex flex-col overflow-hidden border-[var(--color-border-subtle)] h-full min-h-0 min-w-0">
      <PanelHeader
        isPro={isPro}
        onOpenSavedAnalyses={handleProSavedAnalyses}
        onOpenChatHistory={handleProChatHistory}
        onRunAnalysis={handleRunAnalysis}
        onClose={onClose}
        isPending={isPending}
        wsStatus={wsStatus}
        isWebSocketSymbol={isWebSocketSymbol}
      />

      <MarketContext symbol={symbol} timeframe={timeframe} priceData={priceData} liveIndicators={liveIndicators} />

      <AnalysisStatus
        isPending={isPending}
        analysisPhase={analysisPhase}
        analysisError={analysisError}
        analysisData={analysisData}
        chatMutationPending={chatMutationPending}
        messages={messages}
      />

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 bg-[var(--color-bg-primary)] min-h-0 custom-scrollbar">
        <AnimatePresence mode="wait" initial={false}>
          {analysisError && !analysisData && !isPending && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <ErrorState error={analysisError} onRetry={handleInitialAnalyze} onDismiss={onDismissError} />
            </motion.div>
          )}

          {!analysisData && !analysisError && !isPending && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <IdleState symbol={symbol} timeframe={timeframe} onAnalyze={handleInitialAnalyze} />
            </motion.div>
          )}

          {isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <LoadingState analysisPhase={analysisPhase} />
            </motion.div>
          )}

          {analysisData && !isPending && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <SuccessState
                analysisData={analysisData}
                symbol={symbol}
                messages={messages}
                onQuickAction={onQuickAction}
                onCopy={onCopy}
                onToggleExpand={onToggleExpand}
                onBookmarkMessage={onBookmarkMessage}
                copiedId={copiedId}
                bookmarkedIds={bookmarkedIds}
                expandedMessages={expandedMessages}
                onSaveThesis={onSaveThesis}
                thesisSaving={thesisSaving}
                thesisSaved={thesisSaved}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InputBar
        inputText={inputText}
        setInputText={setInputText}
        onSendChat={onSendChat}
        analysisData={analysisData}
        onRunAnalysis={handleInitialAnalyze}
        isPending={isPending}
        chatMutationPending={chatMutationPending}
        showFollowUps={showFollowUps}
        onFollowUp={handleFollowUp}
        analysisLimit={analysisLimit}
        analysesCountToday={analysesCountToday}
        isDemoMode={isDemoMode}
        chatInputRef={chatInputRef}
      />
    </div>
  );
}
