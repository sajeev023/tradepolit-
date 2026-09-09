"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface PageLoaderProps {
  label?: string;
  variant?: "spinner" | "stages";
  stages?: string[];
  className?: string;
}

export function PageLoader({
  label = "Loading...",
  variant = "spinner",
  stages,
  className = "",
}: PageLoaderProps) {
  if (variant === "stages" && stages?.length) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
        <div className="relative w-10 h-10 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border-default)]" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[var(--color-accent-primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <span className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">{label}</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {stages.map((stage, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-2 py-1 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              {stage}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <Loader2 className="animate-spin text-[var(--color-accent-primary)] mb-3" size={28} />
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}

interface InlineLoaderProps {
  label?: string;
  className?: string;
}

export function InlineLoader({ label, className = "" }: InlineLoaderProps) {
  return (
    <div className={`flex items-center justify-center gap-2 py-6 text-[var(--color-text-tertiary)] ${className}`}>
      <RefreshCw size={14} className="animate-spin" />
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  reason?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this section right now.",
  reason,
  retryLabel = "Retry",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`rounded-xl border border-[var(--color-loss)]/20 bg-[var(--color-loss)]/5 p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-[var(--color-loss)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      {reason && (
        <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] px-3 py-1.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60 inline-block">
          {reason}
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={13} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerMs?: number;
}

export function StaggerContainer({ children, className = "", staggerMs = 50 }: StaggerContainerProps) {
  return (
    <div className={`${className}`} style={{ "--stagger-ms": `${staggerMs}ms` } as React.CSSProperties}>
      {React.Children.map(children, (child, i) => (
        <div
          key={i}
          className="animate-enter"
          style={{ animationDelay: `calc(var(--stagger-ms) * ${i})` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
