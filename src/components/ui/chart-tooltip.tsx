"use client";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string | number;
  /** Format the value as a USD amount (default true). */
  currency?: boolean;
  /** Override the default formatter entirely. */
  valueFormatter?: (value: number) => string;
  /** Accent color for the value (defaults to the brand accent). */
  accentColor?: string;
}

/**
 * ChartTooltip — the single recharts tooltip content component for the
 * product's quantitative charts. Replaces the per-page `CustomTooltip`
 * duplicates that had drifted in background, shadow, and label color tokens.
 *
 *   • Token-driven only (no raw hex/rgb) — tracks the design system.
 *   • Currency by default; pass `valueFormatter` for non-dollar metrics.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  currency = true,
  valueFormatter,
  accentColor = "var(--color-accent-primary)",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const raw = Number(payload[0].value);
  const formatted = valueFormatter
    ? valueFormatter(raw)
    : currency
      ? `$${raw.toFixed(2)}`
      : raw.toLocaleString("en-US");

  return (
    <div
      className="px-3 py-2.5 rounded-lg text-xs"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p className="text-[10px] mb-1" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </p>
      <p className="font-mono font-bold text-sm" style={{ color: accentColor }}>
        {formatted}
      </p>
    </div>
  );
}