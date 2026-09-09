"use client";

import React from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";

export interface Contradiction {
  /** Human-readable summary of the conflict. */
  summary: string;
  /** What evidence/supports this side. */
  a: { label: string; detail?: string };
  /** What contradicts it. */
  b: { label: string; detail?: string };
  /** Why it matters to the decision. */
  impact: string;
}

export interface ContradictionBannerProps {
  contradictions: Contradiction[];
  className?: string;
}

export function findContradictions(evidenceFor: string[], evidenceAgainst: string[]): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const has = (list: string[], keyword: string) => list.some((s) => s.toLowerCase().includes(keyword));

  // Structure vs momentum conflict
  const bullishStructure =
    has(evidenceFor, "trending up") ||
    has(evidenceFor, "breakout") ||
    has(evidenceFor, "bullish structure") ||
    has(evidenceFor, "ema crossover bullish") ||
    has(evidenceFor, "macd crossover bullish");

  const bearishMomentum =
    has(evidenceAgainst, "overbought") ||
    has(evidenceAgainst, "rsi") && has(evidenceAgainst, "bearish") ||
    has(evidenceAgainst, "macd bearish");

  if (bullishStructure && bearishMomentum) {
    contradictions.push({
      summary: "Bullish structure, but momentum is weakening",
      a: { label: "Structure", detail: "Trend/regime or EMA/MACD crossover supports direction" },
      b: { label: "Momentum", detail: "RSI overbought or MACD turning against the move" },
      impact: "A structure thesis with fading momentum is more likely to fail on follow-through. Consider a tighter invalidation or smaller size.",
    });
  }

  // MTF conflict
  const mtfMixed = evidenceFor.some((s) => s.toLowerCase().includes("mixed")) ||
    evidenceAgainst.some((s) => s.toLowerCase().includes("higher timeframes disagree"));
  if (mtfMixed) {
    contradictions.push({
      summary: "Multi-timeframe alignment is mixed",
      a: { label: "Selected TF", detail: "Setup appears valid on the current timeframe" },
      b: { label: "Higher TF", detail: "Higher timeframes do not confirm the same direction" },
      impact: "Counter-trend risk is elevated. A higher-TF reversal can erase a lower-TF edge quickly.",
    });
  }

  // Volume / volatility conflict
  if (has(evidenceFor, "volume surge") && has(evidenceAgainst, "volatility spike")) {
    contradictions.push({
      summary: "Participation is high, but volatility is spiking",
      a: { label: "Volume", detail: "Volume surge confirms interest behind the move" },
      b: { label: "Volatility", detail: "Volatility spike makes stop placement unreliable" },
      impact: "A valid move can still stop you out on noise. Widen stops only if it does not break your R:R plan.",
    });
  }

  return contradictions;
}

export function ContradictionBanner({ contradictions, className = "" }: ContradictionBannerProps) {
  if (contradictions.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 p-3.5 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-warning)]">
        <ShieldAlert size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Conflict Detected</span>
      </div>

      {contradictions.map((c, idx) => (
        <div key={idx} className="space-y-2">
          <div className="text-xs font-semibold text-[var(--color-text-primary)]">{c.summary}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)]">
              <div className="text-[10px] uppercase text-[var(--color-profit)] font-semibold mb-0.5">{c.a.label}</div>
              <div className="text-[10px] text-[var(--color-text-secondary)]">{c.a.detail}</div>
            </div>
            <div className="p-2 rounded bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)]">
              <div className="text-[10px] uppercase text-[var(--color-loss)] font-semibold mb-0.5">{c.b.label}</div>
              <div className="text-[10px] text-[var(--color-text-secondary)]">{c.b.detail}</div>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>{c.impact}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
