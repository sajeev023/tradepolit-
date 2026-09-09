"use client";

import React from "react";
import { Activity, WifiOff, Clock } from "lucide-react";
import { DirectionBadge, RegimeTag } from "@/components/ui/decision-primitives";

export type DataFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

export interface MarketHeaderProps {
  symbol: string;
  timeframe: string;
  price?: number;
  change24h?: number;
  changePercent24h?: number;
  regime?: string;
  bias?: string;
  freshness?: DataFreshness;
  freshnessReason?: string;
  activeThesisState?: {
    status?: string;
    invalidation?: number;
    target?: number;
  } | null;
}

function formatPrice(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function MarketHeader({
  symbol,
  timeframe,
  price,
  change24h,
  changePercent24h,
  regime,
  bias,
  freshness = "FRESH",
  freshnessReason,
  activeThesisState,
}: MarketHeaderProps) {
  const isUp = (change24h ?? 0) >= 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] select-none">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
          style={{
            backgroundColor: "rgba(47, 198, 232, 0.08)",
            borderColor: "rgba(47, 198, 232, 0.25)",
            color: "var(--color-accent-primary)",
          }}
        >
          <Activity size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] tracking-tight font-mono">
              {symbol}
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] uppercase">
              {timeframe}
            </span>
            {bias && <DirectionBadge direction={bias} size="sm" />}
            {regime && <RegimeTag regime={regime} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg sm:text-xl font-bold font-mono text-[var(--color-text-primary)]">
              {formatPrice(price)}
            </span>
            {changePercent24h !== undefined && (
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: isUp ? "var(--color-profit)" : "var(--color-loss)" }}
              >
                {isUp ? "+" : ""}
                {changePercent24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {activeThesisState?.status && activeThesisState.status !== "OPEN" && (
          <span
            className="text-[10px] font-mono font-semibold px-2 py-1 rounded border"
            style={{
              backgroundColor: "rgba(47, 198, 232, 0.08)",
              borderColor: "rgba(47, 198, 232, 0.25)",
              color: "var(--color-accent-primary)",
            }}
          >
            ACTIVE THESIS
          </span>
        )}
        {freshnessBadge(freshness, freshnessReason)}
      </div>
    </div>
  );
}

function freshnessBadge(freshness: DataFreshness, reason?: string) {
  if (freshness === "UNAVAILABLE") {
    return (
      <span
        className="px-2 py-1 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
        style={{
          backgroundColor: "rgba(255, 107, 107, 0.08)",
          color: "var(--color-loss)",
          borderColor: "rgba(255, 107, 107, 0.25)",
        }}
        title={reason}
      >
        <WifiOff size={10} />
        DATA UNAVAILABLE
      </span>
    );
  }
  if (freshness === "STALE") {
    return (
      <span
        className="px-2 py-1 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
        style={{
          backgroundColor: "rgba(245, 185, 66, 0.08)",
          color: "var(--color-warning)",
          borderColor: "rgba(245, 185, 66, 0.25)",
        }}
        title={reason}
      >
        <Clock size={10} />
        STALE
      </span>
    );
  }
  return (
    <span
      className="px-2 py-1 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
      style={{
        backgroundColor: "rgba(45, 212, 168, 0.08)",
        color: "var(--color-profit)",
        borderColor: "rgba(45, 212, 168, 0.25)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-profit)] animate-pulse" />
      LIVE
    </span>
  );
}
