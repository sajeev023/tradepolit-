"use client";

import React from "react";
import { Clock, ArrowRight, TrendingUp, Activity, Layers, AlertTriangle, Scale, ShieldAlert } from "lucide-react";
import type { StateChange } from "@/lib/analysis-engine";

export type { StateChange };

interface ClassifiedChangesPanelProps {
  changes: StateChange[];
  symbol?: string;
  className?: string;
}

const categoryMeta: Record<StateChange["category"], { label: string; icon: React.ReactNode; color: string }> = {
  STRUCTURAL: { label: "Structure", icon: <Layers size={10} />, color: "var(--color-accent-primary)" },
  MOMENTUM: { label: "Momentum", icon: <Activity size={10} />, color: "var(--color-warning)" },
  VOLATILITY: { label: "Volatility", icon: <TrendingUp size={10} />, color: "var(--color-loss)" },
  REGIME: { label: "Regime", icon: <Scale size={10} />, color: "var(--color-profit)" },
  PRICE: { label: "Price", icon: <ArrowRight size={10} />, color: "var(--color-text-primary)" },
  RISK: { label: "Risk", icon: <ShieldAlert size={10} />, color: "var(--color-loss)" },
  EVIDENCE: { label: "Evidence", icon: <AlertTriangle size={10} />, color: "var(--color-warning)" },
};

function formatValue(value: number | string | boolean | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

export function ClassifiedChangesPanel({ changes, symbol = "Asset", className = "" }: ClassifiedChangesPanelProps) {
  if (changes.length === 0) {
    return (
      <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-[var(--color-text-tertiary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">What Changed?</span>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          No material change since the prior snapshot for {symbol}.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--color-accent-primary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">What Changed? ({changes.length})</span>
        </div>
      </div>

      <div className="space-y-2">
        {changes.slice(0, 8).map((change, idx) => {
          const meta = categoryMeta[change.category];
          return (
            <div
              key={`${change.variable}-${idx}`}
              className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 text-[11px]"
            >
              <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
                >
                  {meta.icon}
                </span>
              </div>
              <div className="col-span-10 sm:col-span-3">
                <div className="font-semibold text-[var(--color-text-primary)]">{change.variable}</div>
                <div className="text-[9px] text-[var(--color-text-tertiary)]">{meta.label}</div>
              </div>
              <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <span className="line-through text-[var(--color-text-quaternary)]">{formatValue(change.then)}</span>
                <ArrowRight size={10} className="text-[var(--color-text-tertiary)] shrink-0" />
                <span className="font-medium text-[var(--color-text-primary)]">{formatValue(change.now)}</span>
              </div>
              <div className="col-span-7 sm:col-span-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {change.percentChange !== undefined && (
                    <span className={`font-mono ${change.percentChange >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                      {change.percentChange >= 0 ? "+" : ""}
                      {change.percentChange.toFixed(2)}%
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      change.significance === "MAJOR"
                        ? "border-[var(--color-loss)]/30 text-[var(--color-loss)]"
                        : change.significance === "MODERATE"
                          ? "border-[var(--color-warning)]/30 text-[var(--color-warning)]"
                          : "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    {change.significance}
                  </span>
                </div>
              </div>
              {change.reason && (
                <div className="col-span-12 text-[10px] text-[var(--color-text-tertiary)] leading-relaxed">
                  {change.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
