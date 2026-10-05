import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Mono, tracked, uppercase label — the system's "instrument label". */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-quaternary)] ${className}`}>
      {children}
    </span>
  );
}

interface PanelProps {
  label?: string;
  title?: ReactNode;
  action?: { href: string; text: string };
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/** Standard content surface: label + title header, optional action, hairline body. */
export function Panel({ label, title, action, right, children, className = "", padded = true }: PanelProps) {
  const hasHeader = label || title || action || right;
  return (
    <section className={`card ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 pb-0 pt-4">
          <div className="min-w-0">
            {label && <Label>{label}</Label>}
            {title && <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</h2>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {right}
            {action && (
              <Link href={action.href} className="group flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--accent)]">
                {action.text}
                <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
              </Link>
            )}
          </div>
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** Signed percentage / value with semantic colour and arrow. */
export function Delta({ value, suffix = "%", digits = 2, className = "" }: { value: number; suffix?: string; digits?: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={`font-mono tabular-nums ${className}`} style={{ color: up ? "var(--color-profit)" : "var(--color-loss)" }}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(digits)}{suffix}
    </span>
  );
}

/** Large tabular number with a label above and optional note below. */
export function Stat({
  label,
  value,
  note,
  tone = "neutral",
  size = "md",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "neutral" | "gain" | "loss" | "signal";
  size?: "md" | "lg";
}) {
  const color =
    tone === "gain" ? "var(--color-profit)" : tone === "loss" ? "var(--color-loss)" : tone === "signal" ? "var(--accent)" : "var(--color-text-primary)";
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <p
        className={`mt-1.5 truncate font-mono font-medium tabular-nums tracking-[-0.03em] ${size === "lg" ? "text-[34px] leading-none" : "text-[24px] leading-none"}`}
        style={{ color }}
      >
        {value}
      </p>
      {note && <p className="mt-1.5 truncate text-[11.5px] text-[var(--color-text-tertiary)]">{note}</p>}
    </div>
  );
}

type ChipTone = "gain" | "loss" | "warn" | "signal" | "neutral";
const CHIP: Record<ChipTone, { fg: string; bg: string }> = {
  gain: { fg: "var(--color-profit)", bg: "var(--color-profit-bg)" },
  loss: { fg: "var(--color-loss)", bg: "var(--color-loss-bg)" },
  warn: { fg: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  signal: { fg: "var(--accent)", bg: "rgba(var(--accent-rgb), 0.1)" },
  neutral: { fg: "var(--color-text-secondary)", bg: "var(--color-bg-hover)" },
};

export function Chip({ tone = "neutral", children, dot = false }: { tone?: ChipTone; children: ReactNode; dot?: boolean }) {
  const c = CHIP[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: c.fg, background: c.bg }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.fg }} />}
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 py-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed text-[var(--color-text-tertiary)]" style={{ borderColor: "var(--color-border-strong)" }}>
        {icon}
      </span>
      <div>
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]">{body}</p>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}
