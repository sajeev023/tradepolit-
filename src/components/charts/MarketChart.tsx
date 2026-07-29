"use client";

import { memo } from "react";
import { supportsTradingViewWidget } from "@/lib/supported-symbols";
import { TradingViewChart } from "./TradingViewChart";
import { LightweightChart } from "./LightweightChart";

interface MarketChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
}

/**
 * Top-level Market Chart Router.
 *
 * Evaluates whether a market is officially supported by TradingView's free embed iframe widget
 * BEFORE component instantiation.
 *
 * - Supported (US Equities, Crypto, Forex, Commodities) -> Renders TradingViewChart
 * - Unsupported (India, Japan, UK, Germany, France, UAE, Europe equities) -> Renders LightweightChart (Native)
 *
 * Guarantees zero iframe creation and zero script loading for unsupported markets.
 */
export const MarketChart = memo(function MarketChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
}: MarketChartProps) {
  const isTvSupported = supportsTradingViewWidget(symbol);

  if (isTvSupported) {
    return <TradingViewChart symbol={symbol} timeframe={timeframe} isMaximized={isMaximized} />;
  }

  return <LightweightChart symbol={symbol} timeframe={timeframe} isMaximized={isMaximized} />;
});
