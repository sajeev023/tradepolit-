"use client";

import React from "react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
}

const gapMap = {
  sm: "var(--shell-gap-sm, 0.75rem)",
  md: "var(--shell-gap, 1.25rem)",
  lg: "var(--shell-gap-lg, 1.5rem)",
};

export function PageShell({ children, className = "", gap = "md" }: PageShellProps) {
  return (
    <div
      className={`app-shell ${className}`}
      style={{ gap: gapMap[gap] }}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header__title-block">
        {eyebrow && (
          <span className="page-header__eyebrow">
            {eyebrowIcon && <span className="page-header__eyebrow-icon">{eyebrowIcon}</span>}
            {eyebrow}
          </span>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

interface SectionCardProps {
  title?: React.ReactNode;
  titleIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  titleIcon,
  headerActions,
  footer,
  children,
  className = "",
  bodyClassName = "",
}: SectionCardProps) {
  return (
    <section className={`section-card relative ${className}`}>
      {title && (
        <div className="section-card__header">
          <h2 className="section-card__title">
            {titleIcon && <span className="text-[var(--color-accent-primary)]">{titleIcon}</span>}
            {title}
          </h2>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className={`section-card__body ${bodyClassName}`}>{children}</div>
      {footer && <div className="section-card__footer">{footer}</div>}
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ReactElement;
  tone?: "default" | "profit" | "loss" | "accent" | "warning";
  className?: string;
  style?: React.CSSProperties;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone = "default",
  className = "",
  style,
}: MetricCardProps) {
  const toneColor =
    tone === "profit"
      ? "var(--color-profit)"
      : tone === "loss"
      ? "var(--color-loss)"
      : tone === "warning"
      ? "var(--color-warning)"
      : tone === "accent"
      ? "var(--color-accent-primary)"
      : "var(--color-text-primary)";

  return (
    <div className={`card p-4 border-[var(--color-border-default)] ${className}`} style={style}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-tertiary)]">
          {label}
        </span>
        {icon && (
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] border border-[rgba(var(--accent-rgb),0.15)]">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-semibold tp-mono leading-none" style={{ color: toneColor }}>
        {value}
      </div>
      {subtext && (
        <div className="mt-1.5 text-[10px] sm:text-[11px] text-[var(--color-text-tertiary)] leading-tight">
          {subtext}
        </div>
      )}
    </div>
  );
}

interface AttentionBannerProps {
  severity: "high" | "medium" | "low";
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function AttentionBanner({
  severity,
  title,
  description,
  action,
  className = "",
}: AttentionBannerProps) {
  const colors = {
    high: {
      border: "rgba(var(--red-rgb), 0.30)",
      bg: "rgba(var(--red-rgb), 0.06)",
      text: "var(--color-loss)",
    },
    medium: {
      border: "rgba(var(--amber-rgb), 0.30)",
      bg: "rgba(var(--amber-rgb), 0.05)",
      text: "var(--color-warning)",
    },
    low: {
      border: "rgba(var(--accent-rgb), 0.25)",
      bg: "rgba(var(--accent-rgb), 0.05)",
      text: "var(--color-accent-primary)",
    },
  }[severity];

  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: colors.text }}>
            {title}
          </div>
          {description && (
            <p className="text-[11px] sm:text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
