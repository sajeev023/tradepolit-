/**
 * src/lib/chart-router.ts
 *
 * THE single source of truth for which chart engine renders which symbol.
 *
 * Rules (from the architecture spec — no exceptions):
 *   US Stock  → "tradingview"
 *   Crypto    → "lightweight"
 *   Forex     → "lightweight"
 *   India     → "echarts"
 *   All other international stocks (UK, Europe, Japan, UAE, etc.) → "echarts"
 *   Commodity → "tradingview"  (OANDA symbols work on TV)
 *   Index (US)→ "tradingview"
 *   Index (non-US) → "echarts"
 *
 * No component, hook, or page should ever contain routing logic.
 * All routing goes through resolveChartEngine().
 */

import { getSupportedSymbol } from "./supported-symbols";

export type ChartEngine = "tradingview" | "lightweight" | "echarts";

/**
 * Resolves the chart engine for a given canonical symbol string.
 *
 * Resolution order:
 *  1. Registry entry's assetClass + region (authoritative)
 *  2. Heuristic fallback for unknown symbols (graceful degradation)
 */
export function resolveChartEngine(symbol: string): ChartEngine {
  const entry = getSupportedSymbol(symbol);

  if (entry) {
    // Crypto → Lightweight Charts
    if (entry.assetClass === "CRYPTO") return "lightweight";

    // Forex → Lightweight Charts
    if (entry.assetClass === "FOREX") return "lightweight";

    // US Stocks → TradingView
    if (entry.assetClass === "STOCK" && entry.region === "US") return "tradingview";

    // Commodities → TradingView (OANDA feeds work)
    if (entry.assetClass === "COMMODITY") return "tradingview";

    // US Indices → TradingView
    if (entry.assetClass === "INDEX" && entry.region === "US") return "tradingview";

    // India stocks → ECharts
    if (entry.assetClass === "STOCK" && entry.region === "IN") return "echarts";

    // All other stocks (UK, EU, JP, AE, GLOBAL) → ECharts
    if (entry.assetClass === "STOCK") return "echarts";

    // Non-US Indices → ECharts
    if (entry.assetClass === "INDEX") return "echarts";
  }

  // ── Unknown symbol heuristic fallback ──────────────────────────────────────
  // Crypto shorthand (X/USD or XUSDT)
  if (symbol.includes("/") && symbol.endsWith("/USD")) return "lightweight";
  // Forex pair (two currency codes separated by /)
  if (/^[A-Z]{3}\/[A-Z]{3}$/.test(symbol)) return "lightweight";
  // Default: TradingView for unknown symbols (best-effort)
  return "tradingview";
}

/**
 * Convenience predicate — true if the symbol should use TradingView.
 * Replaces the old `supportsTradingViewWidget()` in MarketChart.tsx.
 */
export function isTradingViewSymbol(symbol: string): boolean {
  return resolveChartEngine(symbol) === "tradingview";
}

/**
 * Convenience predicate — true if the symbol should use Lightweight Charts.
 */
export function isLightweightSymbol(symbol: string): boolean {
  return resolveChartEngine(symbol) === "lightweight";
}

/**
 * Convenience predicate — true if the symbol should use ECharts.
 */
export function isEChartsSymbol(symbol: string): boolean {
  return resolveChartEngine(symbol) === "echarts";
}
