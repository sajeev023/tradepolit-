/**
 * src/components/charts/providers/LightweightProvider.ts
 *
 * ChartProvider implementation using TradingView's open-source
 * Lightweight Charts v5 (canvas-based, 60fps, WebSocket-native).
 *
 * Used for: Crypto (BTC/USD, ETH/USD, …) and Forex (EUR/USD, GBP/USD, …).
 *
 * Library: lightweight-charts v5.x
 * v5 API changes: addCandlestickSeries() → addSeries(candlestickSeries, opts)
 *                 addLineSeries()         → addSeries(lineSeries, opts)
 *                 addHistogramSeries()    → addSeries(histogramSeries, opts)
 *
 * Docs: https://tradingview.github.io/lightweight-charts/
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
import {
  calculateEMA,
  calculateSMA,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "@/lib/indicators";

type LWChart = import("lightweight-charts").IChartApi;
type AnySeriesApi = import("lightweight-charts").ISeriesApi<import("lightweight-charts").SeriesType>;

const DARK_THEME = {
  layout: { background: { color: "#0A0A0B" }, textColor: "#A1A1AA" },
  grid: { vertLines: { color: "#1A1A1E" }, horzLines: { color: "#1A1A1E" } },
};

const LIGHT_THEME = {
  layout: { background: { color: "#FAFAFA" }, textColor: "#3F3F46" },
  grid: { vertLines: { color: "#E4E4E7" }, horzLines: { color: "#E4E4E7" } },
};

interface IndicatorState {
  series: AnySeriesApi[];
  name: IndicatorName;
}

export class LightweightProvider implements ChartProvider {
  private chart: LWChart | null = null;
  private candleSeries: AnySeriesApi | null = null;
  private volumeSeries: AnySeriesApi | null = null;
  private indicatorMap: Map<IndicatorName, IndicatorState> = new Map();
  private aiLineMap: Map<string, any> = new Map();

  private container: HTMLElement | null = null;
  private currentSymbol = "";
  private currentTimeframe = "";
  private currentTheme: "dark" | "light" = "dark";
  private currentCandles: OHLCVCandle[] = [];
  private destroyed = false;

  async initialize(
    container: HTMLElement,
    symbol: string,
    timeframe: string,
    theme: "dark" | "light"
  ): Promise<void> {
    if (this.chart) return;
    this.container = container;
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.currentTheme = theme;

    // v5 named imports (PascalCase): CandlestickSeries, HistogramSeries, LineSeries
    const lw = await import("lightweight-charts");

    this.chart = lw.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      ...(theme === "dark" ? DARK_THEME : LIGHT_THEME),
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#1A1A1E",
      },
      rightPriceScale: { borderColor: "#1A1A1E" },
      crosshair: {
        vertLine: { color: "#52525B" },
        horzLine: { color: "#52525B" },
      },
    });

    // v5: addSeries(SeriesDefinition, options)
    this.candleSeries = this.chart.addSeries(lw.CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    this.volumeSeries = this.chart.addSeries(lw.HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    } as any);

    this.chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    console.log(`[LW-PROVIDER] Initialized (v5) for ${symbol} (${timeframe})`);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    this.candleSeries = null;
    this.volumeSeries = null;
    this.indicatorMap.clear();
    this.aiLineMap.clear();
    this.container = null;
  }

  async setSymbol(symbol: string): Promise<void> {
    this.currentSymbol = symbol;
    this.currentCandles = [];
    this.candleSeries?.setData([]);
    this.volumeSeries?.setData([]);
    this.indicatorMap.forEach((state) => state.series.forEach((s) => s.setData([])));
  }

  async setTimeframe(timeframe: string): Promise<void> {
    this.currentTimeframe = timeframe;
  }

  setData(candles: OHLCVCandle[]): void {
    if (!this.chart || !this.candleSeries || !this.volumeSeries || this.destroyed) return;
    this.currentCandles = candles;

    const candleData = candles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as import("lightweight-charts").Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));

    const volumeData = candles.map((c) => ({
      time: Math.floor(c.timestamp / 1000) as import("lightweight-charts").Time,
      value: c.volume,
      color: c.close >= c.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
    }));

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);

    // Reapply active indicators with new data
    const activeIndicators = [...this.indicatorMap.keys()];
    activeIndicators.forEach((name) => {
      const state = this.indicatorMap.get(name);
      if (state) {
        this._removeIndicatorSeries(name);
        this._applyIndicator(name);
      }
    });
  }

  appendHistory(candles: OHLCVCandle[]): void {
    if (!this.candleSeries || this.destroyed) return;
    this.setData([...candles, ...this.currentCandles]);
  }

  updateRealtime(candle: OHLCVCandle): void {
    if (!this.candleSeries || !this.volumeSeries || this.destroyed) return;
    const time = Math.floor(candle.timestamp / 1000) as import("lightweight-charts").Time;

    this.candleSeries.update({ time, open: candle.open, high: candle.high, low: candle.low, close: candle.close });
    this.volumeSeries.update({
      time,
      value: candle.volume,
      color: candle.close >= candle.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
    });

    if (this.currentCandles.length > 0) {
      const last = this.currentCandles[this.currentCandles.length - 1];
      if (last.timestamp === candle.timestamp) {
        this.currentCandles[this.currentCandles.length - 1] = candle;
      } else {
        this.currentCandles.push(candle);
      }
    }
  }

  private async _applyIndicator(name: IndicatorName, params?: IndicatorParams): Promise<void> {
    if (!this.chart || this.currentCandles.length === 0 || this.destroyed) return;
    const lw = await import("lightweight-charts");
    const closes = this.currentCandles.map((c) => c.close);
    const times = this.currentCandles.map((c) =>
      Math.floor(c.timestamp / 1000) as import("lightweight-charts").Time
    );
    const toData = (vals: number[]) =>
      vals.map((v, i) => ({ time: times[i], value: v })).filter((d) => !isNaN(d.value));

    const seriesList: AnySeriesApi[] = [];

    if (name === "EMA") {
      const period = params?.period ?? 20;
      const s = this.chart.addSeries(lw.LineSeries, {
        color: params?.color ?? "#22d3ee", lineWidth: 1,
        title: `EMA ${period}`, lastValueVisible: false, priceLineVisible: false,
      });
      s.setData(toData(calculateEMA(closes, period)));
      seriesList.push(s);
    }

    if (name === "SMA") {
      const period = params?.period ?? 20;
      const s = this.chart.addSeries(lw.LineSeries, {
        color: params?.color ?? "#f59e0b", lineWidth: 1,
        title: `SMA ${period}`, lastValueVisible: false, priceLineVisible: false,
      });
      s.setData(toData(calculateSMA(closes, period)));
      seriesList.push(s);
    }

    if (name === "VWAP") {
      const vals = calculateVWAP(this.currentCandles);
      const s = this.chart.addSeries(lw.LineSeries, {
        color: params?.color ?? "#a78bfa", lineWidth: 1, lineStyle: 1,
        title: "VWAP", lastValueVisible: false, priceLineVisible: false,
      });
      s.setData(toData(vals));
      seriesList.push(s);
    }

    if (name === "BollingerBands") {
      const period = params?.period ?? 20;
      const stdDev = params?.stdDev ?? 2;
      const { upper, middle, lower } = calculateBollingerBands(closes, period, stdDev);
      const configs = [
        { vals: upper, color: "#94a3b8", title: "BB Upper", lineStyle: 2 },
        { vals: middle, color: "#64748b", title: "BB Middle", lineStyle: 0 },
        { vals: lower, color: "#94a3b8", title: "BB Lower", lineStyle: 2 },
      ];
      for (const cfg of configs) {
        const s = this.chart!.addSeries(lw.LineSeries, {
          color: cfg.color, lineWidth: 1, lineStyle: cfg.lineStyle as any,
          title: cfg.title, lastValueVisible: false, priceLineVisible: false,
        });
        s.setData(toData(cfg.vals));
        seriesList.push(s);
      }
    }

    if (name === "RSI") {
      const period = params?.period ?? 14;
      const vals = calculateRSI(closes, period);
      // v5: add to a new pane via chart.addSeries(LineSeries, opts, paneIndex)
      const paneIndex = this.chart.panes().length; // append a new pane
      const s = this.chart.addSeries(lw.LineSeries, {
        color: "#f97316", lineWidth: 1, title: `RSI ${period}`,
        lastValueVisible: false, priceLineVisible: false,
      }, paneIndex);
      s.setData(toData(vals));
      seriesList.push(s);
    }

    if (name === "MACD") {
      const fp = params?.fastPeriod ?? 12;
      const sp = params?.slowPeriod ?? 26;
      const sig = params?.signalPeriod ?? 9;
      const { macd, signal, histogram } = calculateMACD(closes, fp, sp, sig);
      const paneIndex = this.chart.panes().length;
      const toDataFiltered = (vals: number[]) =>
        vals.map((v, i) => ({ time: times[i], value: v })).filter((d) => !isNaN(d.value) && d.value !== 0);

      const macdS = this.chart.addSeries(lw.LineSeries, { color: "#3b82f6", lineWidth: 1, title: "MACD", lastValueVisible: false, priceLineVisible: false }, paneIndex);
      const sigS = this.chart.addSeries(lw.LineSeries, { color: "#f97316", lineWidth: 1, title: "Signal", lastValueVisible: false, priceLineVisible: false }, paneIndex);
      const histS = this.chart.addSeries(lw.HistogramSeries, { title: "Hist" }, paneIndex);

      macdS.setData(toDataFiltered(macd));
      sigS.setData(toDataFiltered(signal));
      histS.setData(
        histogram.map((v, i) => ({
          time: times[i],
          value: isNaN(v) ? 0 : v,
          color: isNaN(v) ? "transparent" : v >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
        })).filter((d) => d.value !== 0)
      );
      seriesList.push(macdS, sigS, histS);
    }

    if (seriesList.length > 0) {
      this.indicatorMap.set(name, { series: seriesList, name });
    }
  }

  addIndicator(name: IndicatorName, params?: IndicatorParams): void {
    if (this.indicatorMap.has(name)) this._removeIndicatorSeries(name);
    this._applyIndicator(name, params);
  }

  private _removeIndicatorSeries(name: IndicatorName): void {
    const state = this.indicatorMap.get(name);
    if (!state || !this.chart) return;
    state.series.forEach((s) => {
      try { this.chart!.removeSeries(s); } catch (_) {}
    });
    this.indicatorMap.delete(name);
  }

  removeIndicator(name: IndicatorName): void {
    this._removeIndicatorSeries(name);
  }

  setTheme(theme: "dark" | "light"): void {
    if (!this.chart || this.currentTheme === theme) return;
    this.currentTheme = theme;
    this.chart.applyOptions(theme === "dark" ? DARK_THEME : LIGHT_THEME);
  }

  resize(): void {
    if (!this.chart || !this.container || this.destroyed) return;
    this.chart.applyOptions({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    });
  }

  getVisibleRange(): VisibleRange | null {
    if (!this.chart) return null;
    const range = this.chart.timeScale().getVisibleRange();
    if (!range) return null;
    return {
      from: (range.from as number) * 1000,
      to: (range.to as number) * 1000,
    };
  }

  setVisibleRange(range: VisibleRange): void {
    if (!this.chart) return;
    this.chart.timeScale().setVisibleRange({
      from: Math.floor(range.from / 1000) as import("lightweight-charts").Time,
      to: Math.floor(range.to / 1000) as import("lightweight-charts").Time,
    });
  }

  addAiOverlay(overlay: AiOverlay): void {
    if (!this.candleSeries || this.destroyed) return;
    if ((overlay.type === "support" || overlay.type === "resistance") && overlay.price !== undefined) {
      const priceLine = (this.candleSeries as any).createPriceLine({
        price: overlay.price,
        color: overlay.color ?? (overlay.type === "support" ? "#22c55e" : "#ef4444"),
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: overlay.label ?? overlay.type,
      });
      this.aiLineMap.set(overlay.id, { priceLine, type: "priceLine" });
    }
    if (overlay.type === "zone") {
      this.aiLineMap.set(overlay.id, { type: "zone", data: overlay });
    }
  }

  removeAiOverlay(id: string): void {
    const item = this.aiLineMap.get(id);
    if (!item) return;
    if (item.type === "priceLine" && this.candleSeries) {
      try { (this.candleSeries as any).removePriceLine(item.priceLine); } catch (_) {}
    }
    this.aiLineMap.delete(id);
  }

  addDrawing(_drawing: DrawingTool): void {}
  removeDrawing(_id: string): void {}

  async takeScreenshot(): Promise<string> {
    if (!this.chart) return "";
    try {
      const canvas = this.chart.takeScreenshot();
      return canvas.toDataURL("image/png");
    } catch (_) {
      return "";
    }
  }
}
