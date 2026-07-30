/**
 * src/components/charts/providers/ChartFactory.ts
 *
 * The only file that imports all three provider implementations.
 * Returns the correct provider for a symbol — all routing decisions
 * are delegated to resolveChartEngine() from chart-router.ts.
 *
 * Usage:
 *   const provider = ChartFactory.create("BTC/USD");
 *   await provider.initialize(container, symbol, timeframe, theme);
 */

import type { ChartProvider } from "./ChartProvider";
import { resolveChartEngine, type ChartEngine } from "@/lib/chart-router";

export class ChartFactory {
  /**
   * Create a ChartProvider instance for the given symbol.
   * Providers are lazy-imported so only the required engine's JS is loaded.
   */
  static async create(symbol: string): Promise<ChartProvider> {
    const engine = resolveChartEngine(symbol);
    return ChartFactory.createByEngine(engine);
  }

  /**
   * Create a provider by explicit engine name (for testing or overrides).
   */
  static async createByEngine(engine: ChartEngine): Promise<ChartProvider> {
    console.log(`[CHART-FACTORY] Creating provider for engine: ${engine}`);

    switch (engine) {
      case "tradingview": {
        const { TradingViewProvider } = await import("./TradingViewProvider");
        return new TradingViewProvider();
      }
      case "lightweight": {
        const { LightweightProvider } = await import("./LightweightProvider");
        return new LightweightProvider();
      }
      case "echarts": {
        const { EChartsProvider } = await import("./EChartsProvider");
        return new EChartsProvider();
      }
      default:
        throw new Error(`[ChartFactory] Unknown engine: ${engine}`);
    }
  }

  /**
   * Resolve the engine name for a symbol without creating a provider.
   * Useful for logging, debugging, or conditional UI rendering.
   */
  static engineFor(symbol: string): ChartEngine {
    return resolveChartEngine(symbol);
  }
}
