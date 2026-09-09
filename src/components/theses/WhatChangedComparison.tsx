"use client";

import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  WifiOff,
} from "lucide-react";

export type DataFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

export interface StateSnapshot {
  price?: number;
  priceSource?: "LIVE" | "SIMULATED";
  regime?: string;
  rsi?: number;
  atr?: number;
  confidence?: number | string;
  confidenceScore?: number;
  momentum?: string;
  support?: number;
  resistance?: number;
  mtfAlignment?: string;
  timestamp?: string | number;
  freshness?: DataFreshness;
  freshnessReason?: string;
}

interface WhatChangedProps {
  thenState: StateSnapshot;
  nowState: StateSnapshot;
  symbol?: string;
  className?: string;
}

function formatPrice(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatTimestamp(ts?: string | number) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

function freshnessBadge(freshness?: DataFreshness, reason?: string) {
  if (freshness === "UNAVAILABLE") {
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
        style={{
          backgroundColor: "rgba(255, 107, 107, 0.08)",
          color: "var(--color-loss)",
          borderColor: "rgba(255, 107, 107, 0.25)",
        }}
        title={reason}
      >
        <WifiOff size={10} /> UNAVAILABLE
      </span>
    );
  }
  if (freshness === "STALE") {
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
        style={{
          backgroundColor: "rgba(245, 185, 66, 0.08)",
          color: "var(--color-warning)",
          borderColor: "rgba(245, 185, 66, 0.25)",
        }}
        title={reason}
      >
        <Clock size={10} /> STALE
      </span>
    );
  }
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border flex items-center gap-1"
      style={{
        backgroundColor: "rgba(45, 212, 168, 0.08)",
        color: "var(--color-profit)",
        borderColor: "rgba(45, 212, 168, 0.25)",
      }}
    >
      <RefreshCw size={10} /> LIVE
    </span>
  );
}

function decisionImpact(priceDelta: number | null, regimeChanged: boolean, rsiDelta: number | null, nowState: StateSnapshot) {
  if (nowState.freshness === "UNAVAILABLE") {
    return {
      text: "Current data unavailable. The historical state is preserved for audit.",
      tone: "muted" as const,
    };
  }

  const impacts: string[] = [];
  if (priceDelta !== null && Math.abs(priceDelta) > 1) {
    impacts.push(`Price has moved ${priceDelta > 0 ? "up" : "down"} ${Math.abs(priceDelta).toFixed(2)}% since commitment.`);
  }
  if (regimeChanged) {
    impacts.push("Market regime changed — the original structure assumption may no longer apply.");
  }
  if (rsiDelta !== null && Math.abs(rsiDelta) > 10) {
    impacts.push(`Momentum shifted meaningfully (RSI ${rsiDelta > 0 ? "+": ""}${rsiDelta.toFixed(0)} pts).`);
  }

  if (impacts.length === 0) {
    return {
      text: "No material change since commitment. The original thesis context remains intact.",
      tone: "neutral" as const,
    };
  }

  return {
    text: impacts.join(" "),
    tone: regimeChanged ? "warning" as const : "neutral" as const,
  };
}

export function WhatChangedComparison({
  thenState,
  nowState,
  symbol = "Asset",
  className = "",
}: WhatChangedProps) {
  const isUnavailable = nowState.freshness === "UNAVAILABLE";

  const priceDelta =
    thenState.price && nowState.price && !isUnavailable
      ? ((nowState.price - thenState.price) / thenState.price) * 100
      : null;

  const rsiDelta =
    thenState.rsi !== undefined && nowState.rsi !== undefined && !isUnavailable
      ? nowState.rsi - thenState.rsi
      : null;

  const regimeChanged = Boolean(
    !isUnavailable &&
    thenState.regime &&
    nowState.regime &&
    thenState.regime !== nowState.regime
  );

  const confidenceChanged =
    !isUnavailable &&
    thenState.confidence !== undefined &&
    nowState.confidence !== undefined &&
    String(thenState.confidence) !== String(nowState.confidence);

  const impact = decisionImpact(priceDelta, regimeChanged, rsiDelta, nowState);

  return (
    <div
      className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/50 p-4 select-none ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border-subtle)]">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <RefreshCw size={13} className="text-[var(--color-accent-primary)]" />
            What Changed? (Then vs Now)
          </h3>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
            Market delta since decision commitment · {symbol}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {regimeChanged && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border"
              style={{
                backgroundColor: "rgba(245, 185, 66, 0.08)",
                color: "var(--color-warning)",
                borderColor: "rgba(245, 185, 66, 0.25)",
              }}
            >
              REGIME SHIFT
            </span>
          )}
          {freshnessBadge(nowState.freshness, nowState.freshnessReason)}
        </div>
      </div>

      {isUnavailable ? (
        <div className="rounded-lg border border-[var(--color-loss)]/20 bg-[var(--color-loss)]/5 p-4 text-xs">
          <div className="flex items-center gap-2 text-[var(--color-loss)] font-semibold mb-1">
            <WifiOff size={14} />
            Current Data Unavailable
          </div>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            Live market data for {symbol} could not be loaded right now. The historical state
            on the left is preserved exactly as it was known at decision time.
          </p>
          <p className="text-[10px] text-[var(--color-text-quaternary)] mt-2">
            {nowState.freshnessReason || "Provider response unavailable"}
          </p>
        </div>
      ) : (
        <>
          {/* Comparison Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Price Delta */}
            <div className="p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block mb-1">
                Price
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                <span className="text-[var(--color-text-tertiary)]">{formatPrice(thenState.price)}</span>
                <ArrowRight size={11} className="text-[var(--color-text-quaternary)]" />
                <span className="text-[var(--color-text-primary)]">{formatPrice(nowState.price)}</span>
              </div>
              {priceDelta !== null && (
                <div
                  className="text-[10px] font-mono font-semibold mt-1 flex items-center gap-0.5"
                  style={{
                    color: priceDelta >= 0 ? "var(--color-profit)" : "var(--color-loss)",
                  }}
                >
                  {priceDelta >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {priceDelta >= 0 ? `+${priceDelta.toFixed(2)}%` : `${priceDelta.toFixed(2)}%`}
                </div>
              )}
            </div>

            {/* Regime Delta */}
            <div className="p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block mb-1">
                Market Regime
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-[var(--color-text-tertiary)] truncate">
                  {thenState.regime ? thenState.regime.replace(/_/g, " ") : "Initial"}
                </span>
                <ArrowRight size={11} className="shrink-0 text-[var(--color-text-quaternary)]" />
                <span
                  className={`truncate font-semibold ${
                    regimeChanged ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {nowState.regime ? nowState.regime.replace(/_/g, " ") : "Current"}
                </span>
              </div>
              <div className="text-[10px] text-[var(--color-text-quaternary)] mt-1">
                {regimeChanged ? "State transformed" : "Regime persistent"}
              </div>
            </div>

            {/* RSI Delta */}
            <div className="p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block mb-1">
                RSI (14)
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                <span className="text-[var(--color-text-tertiary)]">
                  {thenState.rsi !== undefined ? Math.round(thenState.rsi) : "—"}
                </span>
                <ArrowRight size={11} className="text-[var(--color-text-quaternary)]" />
                <span className="text-[var(--color-text-primary)]">
                  {nowState.rsi !== undefined ? Math.round(nowState.rsi) : "—"}
                </span>
              </div>
              {rsiDelta !== null && (
                <div className="text-[10px] font-mono text-[var(--color-text-tertiary)] mt-1">
                  Delta: {rsiDelta >= 0 ? `+${rsiDelta.toFixed(0)}` : `${rsiDelta.toFixed(0)}`} pts
                </div>
              )}
            </div>

            {/* Confidence Delta */}
            <div className="p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40">
              <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block mb-1">
                Confidence
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                <span className="text-[var(--color-text-tertiary)]">
                  {thenState.confidence ?? "—"}
                </span>
                <ArrowRight size={11} className="text-[var(--color-text-quaternary)]" />
                <span className="text-[var(--color-accent-primary)]">
                  {nowState.confidence ?? "—"}
                </span>
              </div>
              <div className="text-[10px] text-[var(--color-text-quaternary)] mt-1">
                {confidenceChanged ? "Recalibrated" : "Unchanged"}
              </div>
            </div>
          </div>

          {/* Decision impact */}
          <div
            className={`mt-3 p-2.5 rounded-lg border text-[11px] leading-relaxed ${
              impact.tone === "warning"
                ? "border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 text-[var(--color-warning)]"
                : impact.tone === "muted"
                  ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 text-[var(--color-text-tertiary)]"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 text-[var(--color-text-secondary)]"
            }`}
          >
            <span className="font-semibold uppercase text-[10px] tracking-wider mr-1.5">Decision Impact:</span>
            {impact.text}
          </div>

          {/* Timestamps */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-quaternary)]">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Then: {formatTimestamp(thenState.timestamp)}
            </span>
            <ArrowRight size={10} />
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Now: {formatTimestamp(nowState.timestamp)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
