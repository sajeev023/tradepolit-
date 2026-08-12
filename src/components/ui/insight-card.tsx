"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * InsightCard — a reusable card for AI analysis output (Bias, Setup,
 * Confidence, Support, Resistance, Invalidation, Trend, etc.).
 *
 * Standardizes the "intelligence tile" look across the charts copilot and
 * the standalone AI assistant so both surfaces feel like one product.
 */
export function InsightCard({
  label,
  value,
  icon,
  accent = "neutral",
  sub,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "profit" | "loss" | "warning" | "accent" | "neutral";
  sub?: string;
  delay?: number;
}) {
  const accentColor =
    accent === "profit"
      ? "var(--color-profit)"
      : accent === "loss"
        ? "var(--color-loss)"
        : accent === "warning"
          ? "var(--color-warning)"
          : accent === "accent"
            ? "var(--color-accent-primary)"
            : "var(--color-text-secondary)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay }}
      className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border-default)] shadow-sm"
    >
      <span
        className="text-[9px] uppercase tracking-wider font-bold block"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}
      </span>
      <span className="font-bold text-xs block mt-1" style={{ color: accentColor }}>
        {value}
      </span>
      {sub && (
        <span className="text-[8px] font-sans block truncate mt-0.5" style={{ color: "var(--color-text-quaternary)" }} title={sub}>
          {sub}
        </span>
      )}
    </motion.div>
  );
}

/**
 * LevelTile — a specialized tile for Support / Resistance / Invalidation levels.
 * Color-coded by semantic meaning with source provenance.
 */
export function LevelTile({
  label,
  value,
  color,
  source,
  delay = 0,
}: {
  label: string;
  value: string;
  color: "profit" | "loss" | "warning";
  source?: string;
  delay?: number;
}) {
  const c =
    color === "profit"
      ? { dot: "var(--color-profit)", text: "var(--color-profit)" }
      : color === "loss"
        ? { dot: "var(--color-loss)", text: "var(--color-loss)" }
        : { dot: "var(--color-warning)", text: "var(--color-warning)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay }}
      className="text-center"
    >
      <span
        className="text-[9px] uppercase tracking-wider font-bold flex items-center justify-center gap-1 mb-0.5"
        style={{ color: c.text }}
      >
        <span>{label}</span>
      </span>
      <span className="font-bold block" style={{ color: c.text }}>
        {value}
      </span>
      {source && (
        <span className="text-[8px] font-sans block truncate mt-0.5" style={{ color: "var(--color-text-quaternary)" }} title={source}>
          {source}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Section — a collapsible analysis section for structured AI narrative output.
 * Parses `## Heading` sections into styled, progressively-disclosed blocks.
 */
export function AnalysisSection({
  title,
  children,
  icon,
  defaultOpen = true,
  accent = "var(--color-accent-primary)",
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  return (
    <details open={defaultOpen} className="group/section">
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none">
        <span className="shrink-0" style={{ color: accent }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
          {title}
        </span>
        <span className="flex-1 h-px bg-[var(--color-border-subtle)]" />
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className="transition-transform duration-200 group-open/section:rotate-180"
          style={{ color: "var(--color-text-quaternary)" }}
        >
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line">
        {children}
      </div>
    </details>
  );
}
