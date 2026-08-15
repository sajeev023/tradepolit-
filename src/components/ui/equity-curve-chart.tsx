"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";

interface EquityCurveChartProps {
  data: Array<Record<string, unknown>>;
  /** Series key on each datum (defaults to "pnl"). */
  dataKey?: string;
  /** X-axis key (defaults to "date"). */
  xKey?: string;
  /** Container height in px (defaults to 240). */
  height?: number;
  /** Area stroke width (defaults to 2). */
  strokeWidth?: number;
  /** Format the Y-axis + tooltip as USD (defaults to true). */
  currency?: boolean;
  /** Animate the area draw-in (defaults to true; false for reduced-motion). */
  animated?: boolean;
  /** Override the stroke/fill color (defaults to the brand accent). */
  color?: string;
  className?: string;
}

/**
 * EquityCurveChart — the single equity/P-L curve primitive used across the
 * dashboard, analytics, and backtester surfaces. Unifies the three drifted
 * copies (different gradient ids, grid stroke, axis color, tooltip styles)
 * behind one token-driven, collision-safe component.
 *
 *   • Generates a unique gradient id per instance via useId, so two curves
 *     can safely share a page (the old hardcoded ids collided silently).
 *   • Token-only colors — the dashboard copy used raw rgba(255,255,255,…)
 *     for grid/axis lines, which broke in light themes; now --color-* tokens.
 *   • `<ChartTooltip />` provides the consistent tooltip geometry.
 */
export function EquityCurveChart({
  data,
  dataKey = "pnl",
  xKey = "date",
  height = 240,
  strokeWidth = 2,
  currency = true,
  animated = true,
  color,
  className,
}: EquityCurveChartProps) {
  const autoId = useId();
  // useId returns ":r0:"-style ids; strip non-id characters for a safe SVG id.
  const gradId = `eq-${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stroke = color || "var(--color-accent-primary)";

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-text-tertiary)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={currency ? (v: number) => `$${v}` : undefined}
          />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fillOpacity={1}
            fill={`url(#${gradId})`}
            animationDuration={animated ? 1200 : 0}
            animationEasing="ease-out"
            isAnimationActive={animated}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}