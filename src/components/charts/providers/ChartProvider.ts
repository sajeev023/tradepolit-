/**
 * src/components/charts/providers/ChartProvider.ts
 *
 * The canonical ChartProvider interface.
 *
 * EVERY chart engine (TradingView, Lightweight Charts, ECharts) MUST implement
 * this interface in full. TradCopilot interacts ONLY with this interface.
 * No component outside /providers/ may import from the engine-specific files.
 */

import type { OHLCVCandle } from "@/lib/types";

export interface VisibleRange {
  /** Unix timestamp in milliseconds */
  from: number;
  /** Unix timestamp in milliseconds */
  to: number;
}

export type IndicatorName =
  | "EMA"
  | "SMA"
  | "VWAP"
  | "RSI"
  | "MACD"
  | "BollingerBands"
  | "ATR";

export interface IndicatorParams {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  color?: string;
}

export type AiOverlayType = "support" | "resistance" | "zone" | "signal";

export interface AiOverlay {
  id: string;
  type: AiOverlayType;
  /** For support/resistance lines */
  price?: number;
  /** For zone bands */
  priceHigh?: number;
  priceLow?: number;
  /** For signal markers */
  time?: number;
  label?: string;
  color?: string;
}

export type DrawingType = "line" | "rect" | "text" | "hline" | "vline";

export interface DrawingTool {
  id: string;
  type: DrawingType;
  points: Array<{ price: number; time: number }>;
  label?: string;
  color?: string;
}

export interface ChartProvider {
  /**
   * Initialize the chart engine, attaching it to the given DOM container.
   * Must be idempotent — calling twice is a no-op.
   */
  initialize(
    container: HTMLElement,
    symbol: string,
    timeframe: string,
    theme: "dark" | "light"
  ): Promise<void>;

  /**
   * Tear down the chart, releasing all resources (canvas, WebGL context,
   * event listeners, timers). Must be called on unmount.
   */
  destroy(): void;

  /**
   * Switch to a new symbol in-place WITHOUT recreating the chart instance.
   * Provider may internally clear series data and trigger a new data load.
   */
  setSymbol(symbol: string): Promise<void>;

  /**
   * Switch to a new timeframe in-place WITHOUT recreating the chart instance.
   */
  setTimeframe(timeframe: string): Promise<void>;

  /**
   * Replace the full OHLCV dataset displayed on the chart.
   * Called after initial data fetch and after timeframe change.
   */
  setData(candles: OHLCVCandle[]): void;

  /**
   * Prepend older candles to support infinite history scrolling.
   * Must NOT reset the current view position.
   */
  appendHistory(candles: OHLCVCandle[]): void;

  /**
   * Apply a real-time WebSocket tick. If the tick's timestamp matches the
   * last candle, update it in-place; otherwise append a new candle.
   * Must NOT trigger React re-renders.
   */
  updateRealtime(candle: OHLCVCandle): void;

  /**
   * Add a technical indicator overlay.
   * If the indicator is already active, update its params.
   */
  addIndicator(name: IndicatorName, params?: IndicatorParams): void;

  /**
   * Remove a technical indicator overlay.
   * No-op if the indicator is not active.
   */
  removeIndicator(name: IndicatorName): void;

  /**
   * Switch between dark and light themes without recreating the chart.
   */
  setTheme(theme: "dark" | "light"): void;

  /**
   * Recalculate chart dimensions from the container element.
   * Call this from a ResizeObserver callback.
   */
  resize(): void;

  /**
   * Return the currently visible time range, or null if not available.
   */
  getVisibleRange(): VisibleRange | null;

  /**
   * Programmatically set the visible time range (e.g., for zoom presets).
   */
  setVisibleRange(range: VisibleRange): void;

  /**
   * Add an AI-generated overlay (support/resistance, trade zone, signal).
   */
  addAiOverlay(overlay: AiOverlay): void;

  /**
   * Remove an AI-generated overlay by its ID.
   */
  removeAiOverlay(id: string): void;

  /**
   * Add a user drawing tool overlay.
   */
  addDrawing(drawing: DrawingTool): void;

  /**
   * Remove a user drawing tool overlay by its ID.
   */
  removeDrawing(id: string): void;

  /**
   * Capture the current chart as a PNG data URL.
   * Returns an empty string if the engine does not support screenshots.
   */
  takeScreenshot(): Promise<string>;
}
