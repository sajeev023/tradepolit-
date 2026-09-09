"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Info,
  Sliders,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ContradictionBanner, findContradictions, type Contradiction } from "./ContradictionBanner";

export interface EvidenceItemData {
  text: string;
  source?: "deterministic" | "ai" | "telemetry";
  indicator?: string;
  timeframe?: string;
  timestamp?: string | number;
  value?: string | number;
  direction?: "for" | "against" | "neutral";
  significance?: string;
}

export interface EvidencePanelProps {
  forItems?: EvidenceItemData[] | string[];
  againstItems?: EvidenceItemData[] | string[];
  timeframe?: string;
  capturedAt?: string;
  symbol?: string;
  showContradictions?: boolean;
  className?: string;
}

function normalizeItems(items: EvidenceItemData[] | string[] | undefined, direction: "for" | "against", timeframe?: string, capturedAt?: string): EvidenceItemData[] {
  if (!items) return [];
  return items.map((item) => {
    if (typeof item === "string") {
      const lower = item.toLowerCase();
      let indicator: string | undefined;
      let value: string | number | undefined;

      if (lower.includes("rsi")) {
        indicator = "RSI (14)";
        const match = item.match(/([\d.]+)\s*\(/);
        if (match) value = Number(match[1]);
      } else if (lower.includes("macd")) {
        indicator = "MACD";
      } else if (lower.includes("ema")) {
        indicator = "EMA";
      } else if (lower.includes("regime")) {
        indicator = "Regime";
      } else if (lower.includes("mtf")) {
        indicator = "MTF";
      } else if (lower.includes("volume")) {
        indicator = "Volume";
      } else if (lower.includes("volatil")) {
        indicator = "Volatility";
      } else if (lower.includes("support") || lower.includes("resistance")) {
        indicator = "Levels";
      } else if (lower.startsWith("ai:")) {
        indicator = "AI Synthesis";
      }

      return {
        text: item,
        source: lower.startsWith("ai:") ? "ai" : "deterministic",
        indicator,
        timeframe,
        timestamp: capturedAt,
        value,
        direction,
        significance: "Recorded at decision time as part of the analytical context.",
      };
    }
    return { ...item, direction: item.direction || direction };
  });
}

export function EvidencePanel({
  forItems = [],
  againstItems = [],
  timeframe = "1h",
  capturedAt,
  symbol,
  showContradictions = true,
  className = "",
}: EvidencePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const forData = normalizeItems(forItems, "for", timeframe, capturedAt);
  const againstData = normalizeItems(againstItems, "against", timeframe, capturedAt);

  const contradictionTextFor = forData.map((e) => e.text);
  const contradictionTextAgainst = againstData.map((e) => e.text);
  const contradictions: Contradiction[] = showContradictions
    ? findContradictions(contradictionTextFor, contradictionTextAgainst)
    : [];

  const toggleItem = (text: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  };

  const total = forData.length + againstData.length;
  if (total === 0 && contradictions.length === 0) return null;

  return (
    <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-3.5 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-[var(--color-accent-primary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">Evidence</span>
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
            {forData.length} for · {againstData.length} against
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {contradictions.length > 0 && <ContradictionBanner contradictions={contradictions} />}

            {forData.length > 0 && (
              <EvidenceGroup
                title="Supporting"
                icon={<CheckCircle size={12} className="text-[var(--color-profit)]" />}
                items={forData}
                color="profit"
                expandedItems={expandedItems}
                onToggle={toggleItem}
              />
            )}

            {againstData.length > 0 && (
              <EvidenceGroup
                title="Contradicting"
                icon={<AlertCircle size={12} className="text-[var(--color-loss)]" />}
                items={againstData}
                color="loss"
                expandedItems={expandedItems}
                onToggle={toggleItem}
              />
            )}

            {symbol && capturedAt && (
              <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-quaternary)] pt-1 border-t border-[var(--color-border-subtle)]">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> Captured {new Date(capturedAt).toLocaleString()}
                </span>
                <span className="font-mono">{symbol}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvidenceGroup({
  title,
  icon,
  items,
  color,
  expandedItems,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  items: EvidenceItemData[];
  color: "profit" | "loss" | "neutral";
  expandedItems: Set<string>;
  onToggle: (text: string) => void;
}) {
  const colorClass = {
    profit: "text-[var(--color-profit)]",
    loss: "text-[var(--color-loss)]",
    neutral: "text-[var(--color-text-secondary)]",
  }[color];

  const bgClass = {
    profit: "bg-[rgba(45,212,168,0.06)] border-[rgba(45,212,168,0.20)]",
    loss: "bg-[rgba(255,107,107,0.06)] border-[rgba(255,107,107,0.20)]",
    neutral: "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]",
  }[color];

  return (
    <div className="space-y-1.5">
      <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${colorClass} flex items-center gap-1`}>
        {icon} {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const isOpen = expandedItems.has(item.text);
          return (
            <div key={item.text} className={`rounded-lg border ${bgClass} overflow-hidden`}>
              <button
                type="button"
                onClick={() => onToggle(item.text)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
              >
                <span className="text-[11px] text-[var(--color-text-primary)] font-mono truncate">
                  {item.text}
                </span>
                <span className="text-[var(--color-text-tertiary)] shrink-0 transition-transform duration-150">
                  {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-2.5 pb-2.5 pt-0 space-y-1.5 text-[11px]"
                  >
                    {item.indicator && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                          <Sliders size={10} /> Indicator
                        </span>
                        <span className="font-mono text-[var(--color-text-secondary)]">{item.indicator}</span>
                      </div>
                    )}
                    {item.value !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-text-tertiary)]">Value</span>
                        <span className="font-mono text-[var(--color-text-primary)]">{String(item.value)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                        <Clock size={10} /> Timeframe
                      </span>
                      <span className="font-mono text-[var(--color-text-secondary)] uppercase">{item.timeframe || "1h"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                        <Zap size={10} /> Source
                      </span>
                      <span
                        className={`font-mono ${
                          item.source === "ai" ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {item.source === "ai" ? "AI Synthesis" : "Deterministic Engine"}
                      </span>
                    </div>
                    {item.significance && (
                      <div className="pt-1.5 border-t border-[var(--color-border-subtle)]">
                        <div className="text-[10px] uppercase font-semibold text-[var(--color-text-quaternary)] mb-0.5">
                          Why It Matters
                        </div>
                        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{item.significance}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
