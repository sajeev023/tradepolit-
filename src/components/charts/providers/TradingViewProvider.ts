/**
 * src/components/charts/providers/TradingViewProvider.ts
 *
 * ChartProvider implementation for TradingView (tv.js embed widget).
 * Used for: US Stocks, Commodities, US Indices.
 *
 * tv.js embed API reference:
 *   https://www.tradingview.com/widget/advanced-chart/
 * The embed widget is NOT the full Charting Library (no chart() method).
 * Available widget-level API: ready(cb), reload(), remove().
 */

import type {
  ChartProvider,
  VisibleRange,
  IndicatorName,
  IndicatorParams,
  AiOverlay,
  DrawingTool,
} from "./ChartProvider";
import type { OHLCVCandle } from "@/lib/types";
import { getTradingViewSymbol } from "@/lib/supported-symbols";
import { tradingViewIntervalFor } from "@/lib/timeframes";

// Map indicator names to TradingView study strings
const TV_STUDIES: Partial<Record<IndicatorName, string>> = {
  EMA: "Moving Average Exponential@tv-basicstudies",
  SMA: "Moving Average@tv-basicstudies",
  RSI: "RSI@tv-basicstudies",
  MACD: "MACD@tv-basicstudies",
  BollingerBands: "Bollinger Bands@tv-basicstudies",
  ATR: "ATR@tv-basicstudies",
  VWAP: "VWAP@tv-basicstudies",
};

export class TradingViewProvider implements ChartProvider {
  private container: HTMLElement | null = null;
  private containerId: string = "";
  private widget: any = null;
  private isWidgetReady = false;
  private widgetGeneration = 0;
  private currentSymbol = "";
  private currentTimeframe = "";
  private currentTheme: "dark" | "light" = "dark";
  private activeStudies: string[] = [
    "RSI@tv-basicstudies",
    "MACD@tv-basicstudies",
    "Moving Average Exponential@tv-basicstudies",
  ];
  private scriptLoaded = false;
  private initResolve: (() => void) | null = null;
  private destroyed = false;

  async initialize(
    container: HTMLElement,
    symbol: string,
    timeframe: string,
    theme: "dark" | "light"
  ): Promise<void> {
    if (this.widget) return; // idempotent
    this.container = container;
    this.containerId = `tv-${Math.random().toString(36).slice(2)}`;
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.currentTheme = theme;

    // Stamp the container ID onto the div
    container.id = this.containerId;

    await this._loadScript();
    await this._createWidget();
  }

  private _loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).TradingView) {
        this.scriptLoaded = true;
        resolve();
        return;
      }
      const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existing) {
        // Script tag exists but TV may not be ready yet — poll briefly
        const poll = setInterval(() => {
          if ((window as any).TradingView) {
            clearInterval(poll);
            this.scriptLoaded = true;
            resolve();
          }
        }, 100);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load TradingView script"));
      document.head.appendChild(script);
    });
  }

  private _createWidget(): Promise<void> {
    return new Promise((resolve) => {
      if (this.destroyed || !this.containerId) { resolve(); return; }
      if (!(window as any).TradingView) { resolve(); return; }

      const tvSymbol = getTradingViewSymbol(this.currentSymbol);
      const tvInterval = tradingViewIntervalFor(this.currentTimeframe);

      this.isWidgetReady = false;
      const gen = ++this.widgetGeneration;

      try {
        this.widget = new (window as any).TradingView.widget({
          width: "100%",
          height: "100%",
          symbol: tvSymbol,
          interval: tvInterval,
          timezone: "Etc/UTC",
          theme: this.currentTheme,
          style: "1",
          locale: "en",
          toolbar_bg: this.currentTheme === "dark" ? "#121214" : "#FAFAFA",
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: this.containerId,
          studies: [...this.activeStudies],
          disabled_features: [
            "header_widget_dom_node",
            "timeframes_toolbar",
            "control_bar",
            "display_market_status",
            "snapshot_trading_dialog",
            "show_logo_on_all_charts",
            "use_localstorage_for_settings",
          ],
          loading_screen: {
            backgroundColor: this.currentTheme === "dark" ? "#0A0A0B" : "#FFFFFF",
          },
        });

        this.widget.ready(() => {
          if (this.widgetGeneration === gen && !this.destroyed) {
            this.isWidgetReady = true;
            console.log(`[TV-PROVIDER] Widget ready for ${tvSymbol}`);
          }
          resolve();
        });
      } catch (err) {
        console.error("[TV-PROVIDER] Widget creation failed:", err);
        resolve(); // don't reject — let the chart show error state
      }
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.widgetGeneration++;
    this.isWidgetReady = false;
    if (this.widget) {
      try { this.widget.remove(); } catch (_) {}
      this.widget = null;
    }
    this.container = null;
  }

  async setSymbol(symbol: string): Promise<void> {
    this.currentSymbol = symbol;
    // tv.js embed does not support in-place symbol change — must reload widget
    await this._destroyWidget();
    await this._createWidget();
  }

  async setTimeframe(timeframe: string): Promise<void> {
    this.currentTimeframe = timeframe;
    await this._destroyWidget();
    await this._createWidget();
  }

  private async _destroyWidget(): Promise<void> {
    this.widgetGeneration++;
    this.isWidgetReady = false;
    if (this.widget) {
      try { this.widget.remove(); } catch (_) {}
      this.widget = null;
    }
    // Clear the container HTML so the next widget gets a clean mount point
    if (this.container) this.container.innerHTML = "";
  }

  // tv.js embed does not accept external OHLCV data — it fetches its own.
  // These methods are no-ops for TradingViewProvider.
  setData(_candles: OHLCVCandle[]): void { /* tv.js manages its own data */ }
  appendHistory(_candles: OHLCVCandle[]): void { /* tv.js manages its own data */ }
  updateRealtime(_candle: OHLCVCandle): void { /* tv.js manages its own stream */ }

  addIndicator(name: IndicatorName, _params?: IndicatorParams): void {
    const study = TV_STUDIES[name];
    if (!study || this.activeStudies.includes(study)) return;
    this.activeStudies.push(study);
    // Reload widget with updated studies list
    this._destroyWidget().then(() => this._createWidget());
  }

  removeIndicator(name: IndicatorName): void {
    const study = TV_STUDIES[name];
    if (!study) return;
    this.activeStudies = this.activeStudies.filter((s) => s !== study);
    this._destroyWidget().then(() => this._createWidget());
  }

  async setTheme(theme: "dark" | "light"): Promise<void> {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    await this._destroyWidget();
    await this._createWidget();
  }

  resize(): void {
    // tv.js iframe resizes automatically with its CSS container — no action needed
  }

  getVisibleRange(): VisibleRange | null {
    // tv.js embed API does not expose time range — return null
    return null;
  }

  setVisibleRange(_range: VisibleRange): void {
    // tv.js embed API does not support programmatic range setting
  }

  addAiOverlay(_overlay: AiOverlay): void {
    // tv.js embed API does not expose drawing/overlay API
    // AI overlays are shown in a separate canvas overlay in UnifiedChart.tsx
  }

  removeAiOverlay(_id: string): void { /* handled by UnifiedChart overlay layer */ }

  addDrawing(_drawing: DrawingTool): void {
    // Drawing tools for TV are rendered via the TV widget's own UI
  }

  removeDrawing(_id: string): void { /* tv.js manages drawings internally */ }

  async takeScreenshot(): Promise<string> {
    // tv.js embed widget does not expose a screenshot API
    // Use html2canvas on the container as a fallback
    try {
      const { default: html2canvas } = await import("html2canvas");
      if (!this.container) return "";
      const canvas = await html2canvas(this.container, { useCORS: true });
      return canvas.toDataURL("image/png");
    } catch (_) {
      return "";
    }
  }
}
