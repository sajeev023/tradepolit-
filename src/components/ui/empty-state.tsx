"use client";

import { ReactNode } from "react";

/**
 * EmptyState — a polished, consistent empty state used across all surfaces.
 * Replaces the scattered "No X yet" text strings.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border-default)]"
        style={{ color: "var(--color-accent-primary)" }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{title}</p>
      {description && (
        <p className="text-xs mt-1.5 text-[var(--color-text-quaternary)] text-center max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * ErrorState — a consistent error state with retry.
 */
export function ErrorState({
  title = "Couldn't load",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card p-5 flex flex-col items-start gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-loss)]">
        {title}
      </span>
      {description && (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors"
          style={{
            backgroundColor: "var(--color-accent-primary-muted)",
            color: "var(--color-accent-primary)",
            border: "1px solid rgba(6,182,212,0.2)",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
