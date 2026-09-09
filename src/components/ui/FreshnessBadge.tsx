"use client";

import React from "react";
import { WifiOff, Clock, RefreshCw } from "lucide-react";

export type DataFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

interface FreshnessBadgeProps {
  freshness: DataFreshness;
  reason?: string;
  showLabel?: boolean;
  className?: string;
}

export function FreshnessBadge({ freshness, reason, showLabel = true, className = "" }: FreshnessBadgeProps) {
  if (freshness === "UNAVAILABLE") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${className}`}
        style={{
          backgroundColor: "rgba(255, 107, 107, 0.08)",
          color: "var(--color-loss)",
          borderColor: "rgba(255, 107, 107, 0.25)",
        }}
        title={reason}
      >
        <WifiOff size={10} />
        {showLabel && "UNAVAILABLE"}
      </span>
    );
  }

  if (freshness === "STALE") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${className}`}
        style={{
          backgroundColor: "rgba(245, 185, 66, 0.08)",
          color: "var(--color-warning)",
          borderColor: "rgba(245, 185, 66, 0.25)",
        }}
        title={reason}
      >
        <Clock size={10} />
        {showLabel && "STALE"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${className}`}
      style={{
        backgroundColor: "rgba(45, 212, 168, 0.08)",
        color: "var(--color-profit)",
        borderColor: "rgba(45, 212, 168, 0.25)",
      }}
      title={reason}
    >
      <RefreshCw size={10} />
      {showLabel && "LIVE"}
    </span>
  );
}

interface DataUnavailableStateProps {
  title?: string;
  reason?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DataUnavailableState({
  title = "Current market data unavailable",
  reason,
  children,
  className = "",
}: DataUnavailableStateProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-loss)]/20 bg-[var(--color-loss)]/5 p-4 text-xs ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--color-loss)] font-semibold mb-1">
        <WifiOff size={14} />
        {title}
      </div>
      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        {children || "Live market data could not be loaded. The preserved state shows what was known when the snapshot was captured."}
      </p>
      {reason && (
        <p className="text-[10px] text-[var(--color-text-quaternary)] mt-2">
          {reason}
        </p>
      )}
    </div>
  );
}
