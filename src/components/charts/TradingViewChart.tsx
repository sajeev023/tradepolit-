"use client";

/**
 * src/components/charts/TradingViewChart.tsx
 *
 * @deprecated Use <UnifiedChart /> or <MarketChart /> directly.
 *
 * This file is kept as a backward-compat stub only. The TradingView widget
 * logic has been moved to TradingViewProvider.ts and is now accessed
 * exclusively through the ChartProvider interface via UnifiedChart.
 *
 * DO NOT add new logic here. Use TradingViewProvider.ts instead.
 */

import { memo } from "react";
import { UnifiedChart } from "./UnifiedChart";

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
}

export const TradingViewChart = memo(function TradingViewChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
}: TradingViewChartProps) {
  return (
    <UnifiedChart
      symbol={symbol}
      timeframe={timeframe}
      isMaximized={isMaximized}
      theme="dark"
    />
  );
});
