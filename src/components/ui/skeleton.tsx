"use client";

/**
 * V4 Skeleton — reusable loading placeholder that matches the design system.
 * Use `variant` for common shapes and `shine` for subtle motion.
 */

function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
interface SkeletonProps {
  className?: string;
  variant?: "text" | "title" | "metric" | "circle" | "rect" | "card";
  width?: string | number;
  height?: string | number;
  shine?: boolean;
}

export function Skeleton({
  className,
  variant = "rect",
  width,
  height,
  shine = true,
}: SkeletonProps) {
  const base = cn(
    "bg-[var(--color-bg-tertiary)] rounded-md",
    shine && "animate-pulse",
    className,
  );

  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  const variantClasses = {
    text: "h-3 w-24 rounded",
    title: "h-5 w-40 rounded",
    metric: "h-8 w-28 rounded",
    circle: "rounded-full",
    rect: "",
    card: "rounded-xl h-full w-full",
  }[variant];

  return <div className={cn(base, variantClasses)} style={style} aria-hidden="true" />;
}

export function SkeletonCard({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] p-4 animate-pulse",
        className,
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] overflow-hidden" aria-hidden="true">
      <div className="grid gap-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60 p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-0 p-3 border-b border-[var(--color-border-subtle)] last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" width={`${40 + Math.random() * 40}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

