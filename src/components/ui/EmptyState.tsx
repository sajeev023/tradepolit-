"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  reason?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  badge?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  reason,
  actionLabel,
  actionHref,
  onAction,
  badge,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto select-none ${className}`}
      style={{
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Icon */}
      {icon ? (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-[var(--color-border-subtle)]"
          style={{
            backgroundColor: "rgba(47, 198, 232, 0.06)",
            color: "var(--color-accent-primary)",
          }}
        >
          {icon}
        </div>
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-[var(--color-border-subtle)]"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            color: "var(--color-text-tertiary)",
          }}
        >
          <Sparkles size={20} />
        </div>
      )}

      {badge && (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-semibold mb-2 border"
          style={{
            backgroundColor: "rgba(47, 198, 232, 0.08)",
            color: "var(--color-accent-primary)",
            borderColor: "rgba(47, 198, 232, 0.20)",
          }}
        >
          {badge}
        </span>
      )}

      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1.5">
        {title}
      </h3>

      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mb-3">
        {description}
      </p>

      {reason && (
        <div
          className="text-[11px] font-mono text-[var(--color-text-tertiary)] px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60 mb-5 max-w-xs"
        >
          Why: {reason}
        </div>
      )}

      {actionLabel && (actionHref || onAction) && (
        <div>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 group cursor-pointer"
              style={{
                backgroundColor: "var(--color-accent-primary)",
                color: "#05070B",
              }}
            >
              <span>{actionLabel}</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <button
              onClick={onAction}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 group cursor-pointer"
              style={{
                backgroundColor: "var(--color-accent-primary)",
                color: "#05070B",
              }}
            >
              <span>{actionLabel}</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
