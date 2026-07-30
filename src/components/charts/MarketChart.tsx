"use client";

import { memo } from "react";
import { UnifiedChart } from "./UnifiedChart";
import { resolveChartEngine } from "@/lib/chart-router";

interface MarketChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
  theme?: "dark" | "light";
}

/**
 * Top-level Market Chart Router.
 *
 * This component is now a PURE PASSTHROUGH to UnifiedChart.
 * All routing decisions (which engine to use) are made inside UnifiedChart
 * via ChartFactory → resolveChartEngine() in chart-router.ts.
 *
 * Routing rules (enforced in chart-router.ts — no exceptions):
 *   US Stock   → TradingView
 *   Crypto     → Lightweight Charts
 *   Forex      → Lightweight Charts
 *   India      → Apache ECharts
 *   International Stocks (UK/EU/JP/AE) → Apache ECharts
 *
 * No routing logic lives here. Adding a new market = edit chart-router.ts only.
 */
export const MarketChart = memo(function MarketChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
  theme = "dark",
}: MarketChartProps) {
  const engine = resolveChartEngine(symbol);
  console.log(`[CHART-ROUTER] symbol=${symbol} engine=${engine} timeframe=${timeframe}`);

  return (
    <UnifiedChart
      symbol={symbol}
      timeframe={timeframe}
      isMaximized={isMaximized}
      theme={theme}
    />
  );
});
