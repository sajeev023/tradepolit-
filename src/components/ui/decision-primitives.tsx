"use client";

import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Activity,
  Layers,
  Sparkles
} from "lucide-react";

// ============================================================================
// STATUS PILL
// ============================================================================
export type DecisionStatus = "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED" | "WIN" | "LOSS" | "BREAKEVEN" | "NO_TRADE";

interface StatusPillProps {
  status: DecisionStatus | string;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function StatusPill({ status, className = "", size = "sm" }: StatusPillProps) {
  const norm = (status || "").toUpperCase();
  
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-[11px] gap-1.5 font-medium",
    md: "px-2.5 py-1 text-xs gap-1.5 font-medium",
  }[size];

  switch (norm) {
    case "OPEN":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(47, 198, 232, 0.08)",
            color: "var(--color-accent-primary)",
            borderColor: "rgba(47, 198, 232, 0.25)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
          ACTIVE
        </span>
      );
    case "HIT":
    case "WIN":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(45, 212, 168, 0.08)",
            color: "var(--color-profit)",
            borderColor: "rgba(45, 212, 168, 0.25)",
          }}
        >
          <CheckCircle2 size={size === "xs" ? 10 : 12} />
          {norm === "HIT" ? "TARGET HIT" : "WIN"}
        </span>
      );
    case "INVALIDATED":
    case "LOSS":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(255, 107, 107, 0.08)",
            color: "var(--color-loss)",
            borderColor: "rgba(255, 107, 107, 0.25)",
          }}
        >
          <XCircle size={size === "xs" ? 10 : 12} />
          {norm === "INVALIDATED" ? "INVALIDATED" : "LOSS"}
        </span>
      );
    case "EXPIRED":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            color: "var(--color-text-tertiary)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Clock size={size === "xs" ? 10 : 12} />
          EXPIRED
        </span>
      );
    case "BREAKEVEN":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(245, 185, 66, 0.08)",
            color: "var(--color-warning)",
            borderColor: "rgba(245, 185, 66, 0.25)",
          }}
        >
          <Minus size={size === "xs" ? 10 : 12} />
          BREAKEVEN
        </span>
      );
    case "NO_TRADE":
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            color: "var(--color-text-tertiary)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          OBSERVED
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded border tracking-wide select-none ${sizeClasses} ${className}`}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            color: "var(--color-text-secondary)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          {status}
        </span>
      );
  }
}

// ============================================================================
// DIRECTION BADGE
// ============================================================================
export function DirectionBadge({
  direction,
  size = "sm",
  className = "",
}: {
  direction: "LONG" | "SHORT" | "NEUTRAL" | string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const norm = (direction || "").toUpperCase();
  const isLong = norm.includes("LONG") || norm.includes("BUY");
  const isShort = norm.includes("SHORT") || norm.includes("SELL");

  const sizeClasses = {
    xs: "px-1.5 py-0.2 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-[11px] gap-1 font-semibold",
    md: "px-2.5 py-1 text-xs gap-1.5 font-semibold",
  }[size];

  if (isLong) {
    return (
      <span
        className={`inline-flex items-center rounded font-mono select-none border ${sizeClasses} ${className}`}
        style={{
          backgroundColor: "rgba(45, 212, 168, 0.10)",
          color: "var(--color-profit)",
          borderColor: "rgba(45, 212, 168, 0.30)",
        }}
      >
        <TrendingUp size={size === "xs" ? 10 : 12} strokeWidth={2.5} />
        LONG
      </span>
    );
  }

  if (isShort) {
    return (
      <span
        className={`inline-flex items-center rounded font-mono select-none border ${sizeClasses} ${className}`}
        style={{
          backgroundColor: "rgba(255, 107, 107, 0.10)",
          color: "var(--color-loss)",
          borderColor: "rgba(255, 107, 107, 0.30)",
        }}
      >
        <TrendingDown size={size === "xs" ? 10 : 12} strokeWidth={2.5} />
        SHORT
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded font-mono select-none border ${sizeClasses} ${className}`}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        color: "var(--color-text-secondary)",
        borderColor: "rgba(255, 255, 255, 0.10)",
      }}
    >
      <Minus size={size === "xs" ? 10 : 12} strokeWidth={2} />
      NEUTRAL
    </span>
  );
}

// ============================================================================
// REGIME TAG
// ============================================================================
export function RegimeTag({ regime, className = "" }: { regime: string | null | undefined; className?: string }) {
  if (!regime) return null;
  const norm = regime.toUpperCase();
  const isTrendingUp = norm.includes("TRENDING_UP") || norm.includes("BULLISH");
  const isTrendingDown = norm.includes("TRENDING_DOWN") || norm.includes("BEARISH");
  const isVolatile = norm.includes("VOLATIL") || norm.includes("SPIKE");
  const isBreakout = norm.includes("BREAKOUT");
  const isRanging = norm.includes("RANGE") || norm.includes("SIDEWAYS");

  let color = "var(--color-text-secondary)";
  let bg = "rgba(255, 255, 255, 0.04)";
  let border = "rgba(255, 255, 255, 0.08)";

  if (isTrendingUp) {
    color = "var(--color-profit)";
    bg = "rgba(45, 212, 168, 0.06)";
    border = "rgba(45, 212, 168, 0.20)";
  } else if (isTrendingDown) {
    color = "var(--color-loss)";
    bg = "rgba(255, 107, 107, 0.06)";
    border = "rgba(255, 107, 107, 0.20)";
  } else if (isBreakout) {
    color = "var(--color-accent-primary)";
    bg = "rgba(47, 198, 232, 0.06)";
    border = "rgba(47, 198, 232, 0.20)";
  } else if (isVolatile) {
    color = "var(--color-warning)";
    bg = "rgba(245, 185, 66, 0.06)";
    border = "rgba(245, 185, 66, 0.20)";
  }

  // Format human label
  const label = regime.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-tight border select-none ${className}`}
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      <Activity size={10} />
      {label}
    </span>
  );
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================
export function ConfidenceBadge({
  confidence,
  score,
  className = "",
}: {
  confidence: "HIGH" | "MEDIUM" | "LOW" | string;
  score?: number;
  className?: string;
}) {
  const norm = (confidence || "").toUpperCase();
  const isHigh = norm.includes("HIGH");
  const isMedium = norm.includes("MEDIUM");
  const isLow = norm.includes("LOW");

  let color = "var(--color-text-secondary)";
  let bg = "rgba(255, 255, 255, 0.04)";
  let border = "rgba(255, 255, 255, 0.08)";

  if (isHigh) {
    color = "var(--color-profit)";
    bg = "rgba(45, 212, 168, 0.08)";
    border = "rgba(45, 212, 168, 0.25)";
  } else if (isMedium) {
    color = "var(--color-accent-primary)";
    bg = "rgba(47, 198, 232, 0.08)";
    border = "rgba(47, 198, 232, 0.25)";
  } else if (isLow) {
    color = "var(--color-warning)";
    bg = "rgba(245, 185, 66, 0.08)";
    border = "rgba(245, 185, 66, 0.25)";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border select-none ${className}`}
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      <ShieldCheck size={12} />
      <span>{confidence || "MED"}</span>
      {score !== undefined && (
        <span className="opacity-70 text-[10px]">({Math.round(score)}%)</span>
      )}
    </span>
  );
}

// ============================================================================
// SETUP QUALITY BADGE
// ============================================================================
export function SetupQualityBadge({ quality, className = "" }: { quality?: string | null; className?: string }) {
  if (!quality) return null;
  const isA = quality.includes("A+");
  const isHigh = quality.includes("HIGH");

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border select-none ${className}`}
      style={{
        color: isA ? "var(--color-profit)" : isHigh ? "var(--color-accent-primary)" : "var(--color-text-tertiary)",
        backgroundColor: isA ? "rgba(45, 212, 168, 0.08)" : isHigh ? "rgba(47, 198, 232, 0.08)" : "rgba(255, 255, 255, 0.04)",
        borderColor: isA ? "rgba(45, 212, 168, 0.25)" : isHigh ? "rgba(47, 198, 232, 0.25)" : "rgba(255, 255, 255, 0.08)",
      }}
    >
      <Zap size={10} />
      {quality}
    </span>
  );
}

// ============================================================================
// DECISION METRIC
// ============================================================================
export function DecisionMetric({
  label,
  value,
  subtext,
  delta,
  mono = true,
  tone,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  delta?: { value: string; positive?: boolean };
  mono?: boolean;
  tone?: "profit" | "loss" | "accent" | "warning" | "default";
  className?: string;
}) {
  let valueColor = "var(--color-text-primary)";
  if (tone === "profit") valueColor = "var(--color-profit)";
  if (tone === "loss") valueColor = "var(--color-loss)";
  if (tone === "accent") valueColor = "var(--color-accent-primary)";
  if (tone === "warning") valueColor = "var(--color-warning)";

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--color-text-tertiary)] truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span
          className={`text-sm font-semibold truncate ${mono ? "font-mono" : ""}`}
          style={{ color: valueColor }}
        >
          {value}
        </span>
        {delta && (
          <span
            className="text-[10px] font-mono font-medium"
            style={{
              color: delta.positive === true ? "var(--color-profit)" : delta.positive === false ? "var(--color-loss)" : "var(--color-text-tertiary)",
            }}
          >
            {delta.value}
          </span>
        )}
      </div>
      {subtext && (
        <span className="text-[10px] text-[var(--color-text-quaternary)] truncate mt-0.5">
          {subtext}
        </span>
      )}
    </div>
  );
}
