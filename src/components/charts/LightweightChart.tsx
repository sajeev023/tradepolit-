"use client";

/**
 * src/components/charts/LightweightChart.tsx
 *
 * @deprecated Use <UnifiedChart /> or <MarketChart /> directly.
 *
 * Legacy entry point kept for backward compatibility with any code that
 * still imports LightweightChart by name. All rendering is now delegated
 * to UnifiedChart → LightweightProvider (real lightweight-charts canvas library).
 *
 * The old SVG-based implementation has been replaced by the production-grade
 * canvas-based LightweightProvider.
 */

import { memo } from "react";
import { UnifiedChart } from "./UnifiedChart";

interface LightweightChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
}

export const LightweightChart = memo(function LightweightChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
}: LightweightChartProps) {
  return (
    <UnifiedChart
      symbol={symbol}
      timeframe={timeframe}
      isMaximized={isMaximized}
      theme="dark"
    />
  );
});
