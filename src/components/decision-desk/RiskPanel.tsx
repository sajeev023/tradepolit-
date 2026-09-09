"use client";

import React from "react";
import { ShieldCheck, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

export interface RiskPanelProps {
  entry?: number | string;
  target?: number | string;
  stopLoss?: number | string;
  invalidation?: number | string;
  riskReward?: number | string;
  invalidationConditions?: string;
  accountSize?: number;
  maxRiskPercent?: number;
  maxLossAllowed?: number;
  warnings?: string[];
  className?: string;
}

function formatPrice(n?: number | string) {
  if (n === undefined || n === null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function RiskPanel({
  entry,
  target,
  stopLoss,
  invalidation,
  riskReward,
  invalidationConditions,
  accountSize,
  maxRiskPercent,
  maxLossAllowed,
  warnings = [],
  className = "",
}: RiskPanelProps) {
  const rr = Number(riskReward || 0);

  return (
    <div className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-3.5 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--color-accent-primary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">Risk Guardrails</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">Deterministic Rules</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <LevelBox label="Entry Zone" value={formatPrice(entry)} tone="neutral" />
        <LevelBox label="Target" value={formatPrice(target)} tone="profit" icon={<TrendingUp size={10} />} />
        <LevelBox label="Stop Loss" value={formatPrice(stopLoss)} tone="loss" icon={<TrendingDown size={10} />} />
        <LevelBox label="Invalidation" value={formatPrice(invalidation)} tone="warning" icon={<AlertTriangle size={10} />} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
          <Target size={10} className="text-[var(--color-accent-primary)]" />
          <span className="text-[var(--color-text-tertiary)]">Target R:R:</span>
          <span className="font-mono font-semibold text-[var(--color-text-primary)]">{rr > 0 ? `${rr.toFixed(2)}:1` : "—"}</span>
        </div>
        {accountSize != null && maxRiskPercent != null && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
            <ShieldCheck size={10} className="text-[var(--color-accent-primary)]" />
            <span className="text-[var(--color-text-tertiary)]">Max loss:</span>
            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
              ${Math.max(0, Number(maxLossAllowed || accountSize * (maxRiskPercent / 100))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {invalidationConditions && (
        <div className="mt-3 p-2 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-[11px] font-mono text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-warning)] font-semibold">Rule:</span> {invalidationConditions}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--color-warning)]">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LevelBox({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "neutral" | "profit" | "loss" | "warning";
  icon?: React.ReactNode;
}) {
  const toneColor = {
    neutral: "text-[var(--color-text-tertiary)]",
    profit: "text-[var(--color-profit)]",
    loss: "text-[var(--color-loss)]",
    warning: "text-[var(--color-warning)]",
  }[tone];

  return (
    <div className="p-2 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
      <div className={`text-[10px] uppercase font-semibold ${toneColor} flex items-center gap-1 mb-0.5`}>
        {icon} {label}
      </div>
      <div className="text-xs font-mono font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
