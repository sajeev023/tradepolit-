"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  Sliders, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Zap,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface EvidenceItemData {
  text: string;
  source?: "deterministic" | "ai" | "telemetry";
  timeframe?: string;
  timestamp?: string | number;
  value?: string | number;
  significance?: string;
  provenance?: {
    indicator?: string;
    threshold?: string;
    engine?: string;
    note?: string;
  };
}

interface EvidenceChipProps {
  item: string | EvidenceItemData;
  type?: "for" | "against" | "neutral";
  timeframe?: string;
  timestamp?: string | number;
  onClickAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Parses raw text into structured provenance data when possible
 */
function parseEvidenceText(raw: string, timeframe?: string, timestamp?: string | number): EvidenceItemData {
  const lower = raw.toLowerCase();
  let indicator: string | undefined;
  let significance: string | undefined;
  let value: string | number | undefined;
  let source: "deterministic" | "ai" | "telemetry" = lower.startsWith("ai:") ? "ai" : "deterministic";

  if (lower.includes("rsi")) {
    indicator = "RSI (Relative Strength Index)";
    significance = "Measures velocity and magnitude of price moves to identify exhaustion vs continuation.";
    const match = raw.match(/RSI\(14\)\s+([\d.]+)/i) ?? raw.match(/rsi\s+([\d.]+)/i);
    if (match) value = Number(match[1]);
  } else if (lower.includes("macd")) {
    indicator = "MACD (Moving Average Convergence Divergence)";
    significance = "Tracks momentum shifts and trend agreement between fast and slow exponential averages.";
    const match = raw.match(/histogram\s+([+-]?[\d.]+)/i);
    if (match) value = Number(match[1]);
  } else if (lower.includes("ema") || lower.includes("trend")) {
    indicator = "EMA / Trend Structure";
    significance = "Determines structural direction and trend integrity relative to market noise.";
    const match = raw.match(/([\d.]+)%\s*ema/i);
    if (match) value = `${match[1]}%`;
  } else if (lower.includes("regime")) {
    indicator = "Market Regime Engine";
    significance = "Classifies volatility and directional persistence across lookback windows.";
    const match = raw.match(/Regime:\s*([^—]+)/i);
    if (match) value = match[1].trim();
  } else if (lower.includes("mtf") || lower.includes("multi-timeframe")) {
    indicator = "Multi-Timeframe Alignment";
    significance = "Validates directional confluence across higher and lower operational timeframes.";
    const match = raw.match(/alignment\s+([\w\s]+?)\s+across/i);
    if (match) value = match[1].trim();
  } else if (lower.includes("atr") || lower.includes("volatil")) {
    indicator = "ATR / Volatility Engine";
    significance = "Assesses expansion vs contraction to calibrate realistic invalidation distance.";
    const match = raw.match(/σ\s+([\d.]+)%/i) ?? raw.match(/volatility\s+([\d.]+)%/i);
    if (match) value = `${match[1]}%`;
  } else if (lower.includes("volume") || lower.includes("vwap")) {
    indicator = "Volume & Institutional Participation";
    significance = "Confirms institutional participation and orderflow backing behind price levels.";
    const match = raw.match(/([\d.]+)x\s+average/i);
    if (match) value = `${match[1]}x`;
  } else if (lower.includes("support") || lower.includes("resistance") || lower.includes("level")) {
    indicator = "Key Structural Boundary";
    significance = "Identifies high-liquidity inflection zones where orderflow imbalances trigger reversals.";
    const match = raw.match(/\$([\d,.]+)/);
    if (match) value = `$${match[1]}`;
  } else {
    significance = "Recorded at decision time as part of the immutable analytical context.";
  }

  return {
    text: raw,
    source,
    timeframe: timeframe || "1h",
    timestamp,
    value,
    significance,
    provenance: {
      indicator: indicator || (source === "ai" ? "AI Synthesis" : "Deterministic Telemetry"),
      engine: "TradeCoPilot Context Engine v4.1",
      threshold: "Computed against statistical lookback",
    },
  };
}

export function EvidenceChip({
  item,
  type = "for",
  timeframe,
  timestamp,
  onClickAction,
  className = "",
}: EvidenceChipProps) {
  const [open, setOpen] = useState(false);
  const data: EvidenceItemData = typeof item === "string" ? parseEvidenceText(item, timeframe, timestamp) : item;
  const chipRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const isFor = type === "for";
  const isAgainst = type === "against";

  let chipColor = "var(--color-text-secondary)";
  let chipBg = "rgba(255, 255, 255, 0.04)";
  let chipBorder = "rgba(255, 255, 255, 0.08)";
  let indicatorIcon = <Info size={11} className="shrink-0" />;

  if (isFor) {
    chipColor = "var(--color-profit)";
    chipBg = "rgba(45, 212, 168, 0.06)";
    chipBorder = "rgba(45, 212, 168, 0.20)";
    indicatorIcon = <CheckCircle size={11} className="shrink-0 text-[var(--color-profit)]" />;
  } else if (isAgainst) {
    chipColor = "var(--color-loss)";
    chipBg = "rgba(255, 107, 107, 0.06)";
    chipBorder = "rgba(255, 107, 107, 0.20)";
    indicatorIcon = <AlertCircle size={11} className="shrink-0 text-[var(--color-loss)]" />;
  }

  return (
    <div ref={chipRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 border cursor-pointer hover:border-[var(--color-border-strong)] text-left ${className}`}
        style={{
          color: chipColor,
          backgroundColor: chipBg,
          borderColor: open ? "var(--color-accent-primary)" : chipBorder,
        }}
        aria-expanded={open}
        aria-label={`Evidence: ${data.text}. Click for provenance details.`}
      >
        {indicatorIcon}
        <span className="truncate max-w-[280px] sm:max-w-[340px]">{data.text}</span>
        <ChevronRight
          size={10}
          className={`shrink-0 opacity-60 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Provenance Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] shadow-2xl p-4 text-xs select-none"
            style={{
              backdropFilter: "blur(20px)",
              backgroundColor: "#0A0F18",
            }}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2.5 mb-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[var(--color-accent-primary)]" />
                <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">
                  Evidence Provenance
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] transition-colors p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* Evidence content */}
            <div className="font-mono text-[11px] font-semibold text-[var(--color-text-primary)] mb-2 p-2 rounded bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)]">
              {data.text}
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Sliders size={11} /> Indicator
                </span>
                <span className="font-mono">{data.provenance?.indicator || "Technical Telemetry"}</span>
              </div>

              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Clock size={11} /> Timeframe
                </span>
                <span className="font-mono uppercase">{data.timeframe || timeframe || "1h"}</span>
              </div>

              <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Zap size={11} /> Source
                </span>
                <span className="font-mono text-[var(--color-accent-primary)]">
                  {data.source === "ai" ? "AI Synthesis" : "Deterministic Engine"}
                </span>
              </div>

              {data.significance && (
                <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                  <div className="text-[10px] uppercase font-semibold text-[var(--color-text-quaternary)] mb-1">
                    Why It Matters
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                    {data.significance}
                  </p>
                </div>
              )}
            </div>

            {onClickAction && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onClickAction.onClick();
                }}
                className="mt-3 w-full py-1.5 px-2.5 rounded bg-[var(--color-accent-primary-subtle)] hover:bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] text-[11px] font-medium transition-colors text-center cursor-pointer border border-[rgba(var(--accent-rgb),0.2)]"
              >
                {onClickAction.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
