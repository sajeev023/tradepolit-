/**
 * src/components/charts/providers/EChartsProvider.ts
 *
 * ChartProvider implementation using Apache ECharts.
 * Used for: India (NSE/BSE), UAE (DFM/ADX), UK (LSE), Japan (TSE),
 *           Europe (XETR/Euronext), and all other international stocks.
 *
 * Library: echarts (MIT licensed)
 * Docs: https://echarts.apache.org/en/api.html
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
import { getCurrencySymbol } from "@/lib/supported-symbols";
import {
  calculateEMA,
  calculateSMA,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "@/lib/indicators";

type EChartsInstance = import("echarts").ECharts;

const DARK_BG = "#0A0A0B";
const LIGHT_BG = "#FAFAFA";

/** Convert an OHLCVCandle timestamp (ms) to an ECharts-friendly date string. */
function tsToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Full ISO string for x-axis on sub-hourly timeframes */
function tsToISO(ms: number, timeframe: string): string {
  const minuteFrames = ["1m", "5m", "15m"];
  if (minuteFrames.includes(timeframe)) {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
  }
  return tsToDate(ms);
}

export class EChartsProvider implements ChartProvider {
  private chart: EChartsInstance | null = null;
  private container: HTMLElement | null = null;
  private currentSymbol = "";
  private currentTimeframe = "";
  private currentTheme: "dark" | "light" = "dark";
  private currentCandles: OHLCVCandle[] = [];
  private activeIndicators: Map<IndicatorName, IndicatorParams | undefined> = new Map();
  private aiOverlays: Map<string, AiOverlay> = new Map();
  private destroyed = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

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

    const echarts = await import("echarts");

    // Register a dark theme
    if (!(echarts as any).__tradcopilotThemeRegistered) {
      echarts.registerTheme("tradcopilot-dark", {
        backgroundColor: DARK_BG,
        textStyle: { color: "#A1A1AA" },
      });
      (echarts as any).__tradcopilotThemeRegistered = true;
    }

    this.chart = echarts.init(
      container,
      theme === "dark" ? "tradcopilot-dark" : undefined,
      { renderer: "canvas" }
    );

    // Start real-time polling for this symbol (5s interval for non-WS markets)
    this._startPolling();

    console.log(`[ECHARTS-PROVIDER] Initialized for ${symbol} (${timeframe})`);
  }

  private _startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      if (this.destroyed || !this.currentSymbol) return;
      try {
        const res = await fetch(
          `/api/v1/market/price?symbol=${encodeURIComponent(this.currentSymbol)}`
        );
        if (!res.ok) return;
        const body = await res.json();
        const price: number = body.data?.price;
        if (!price || !this.currentCandles.length) return;

        const lastCandle = this.currentCandles[this.currentCandles.length - 1];
        const now = Date.now();
        const tickCandle: OHLCVCandle = {
          timestamp: now,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, price),
          low: Math.min(lastCandle.close, price),
          close: price,
          volume: 0,
          source: "LIVE",
        };
        this.updateRealtime(tickCandle);
      } catch (_) {}
    }, 5000);
  }

  private _stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this._stopPolling();
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    this.activeIndicators.clear();
    this.aiOverlays.clear();
    this.container = null;
  }

  async setSymbol(symbol: string): Promise<void> {
    this.currentSymbol = symbol;
    this.currentCandles = [];
    this.aiOverlays.clear();
    this._stopPolling();
    this._startPolling();
    if (this.chart) {
      this.chart.clear();
    }
  }

  async setTimeframe(timeframe: string): Promise<void> {
    this.currentTimeframe = timeframe;
    // Data will be repopulated by setData()
  }

  setData(candles: OHLCVCandle[]): void {
    if (!this.chart || this.destroyed) return;
    this.currentCandles = candles;
    this._renderChart();
  }

  appendHistory(candles: OHLCVCandle[]): void {
    if (!this.chart || this.destroyed) return;
    this.currentCandles = [...candles, ...this.currentCandles];
    this._renderChart();
  }

  updateRealtime(candle: OHLCVCandle): void {
    if (!this.chart || this.destroyed || !this.currentCandles.length) return;

    const last = this.currentCandles[this.currentCandles.length - 1];
    if (last.timestamp === candle.timestamp) {
      this.currentCandles[this.currentCandles.length - 1] = {
        ...last,
        high: Math.max(last.high, candle.close),
        low: Math.min(last.low, candle.close),
        close: candle.close,
      };
    } else {
      this.currentCandles.push(candle);
    }
    this._renderChart();
  }

  private _buildOption(): any {
    const candles = this.currentCandles;
    if (!candles.length) return {};

    const currencySymbol = getCurrencySymbol(this.currentSymbol);
    const isDark = this.currentTheme === "dark";
    const axisColor = isDark ? "#3F3F46" : "#D4D4D8";
    const labelColor = isDark ? "#71717A" : "#52525B";
    const bg = isDark ? DARK_BG : LIGHT_BG;

    const dates = candles.map((c) => tsToISO(c.timestamp, this.currentTimeframe));
    const ohlcData = candles.map((c) => [c.open, c.close, c.low, c.high]);
    const volumeData = candles.map((c, i) => ({
      value: c.volume,
      itemStyle: {
        color: c.close >= c.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
      },
    }));

    // Grids: main price chart + volume sub-chart + optional RSI + optional MACD
    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const series: any[] = [];
    const dataZoom: any[] = [];

    let gridIndex = 0;
    const mainGridTop = "5%";
    let mainGridBottom = "25%"; // default with just volume

    // Count sub-pane indicators
    const hasRSI = this.activeIndicators.has("RSI");
    const hasMACD = this.activeIndicators.has("MACD");
    let subPaneCount = 1; // volume is always a sub-pane
    if (hasRSI) subPaneCount++;
    if (hasMACD) subPaneCount++;
    const subPaneHeight = 15; // % each
    mainGridBottom = `${subPaneCount * subPaneHeight + 5}%`;

    // Main price grid
    grids.push({ left: "5%", right: "8%", top: mainGridTop, bottom: mainGridBottom });
    xAxes.push({
      type: "category", data: dates, scale: true, gridIndex: 0,
      boundaryGap: false, axisLine: { onZero: false, lineStyle: { color: axisColor } },
      splitLine: { show: true, lineStyle: { color: axisColor, type: "dashed" } },
      axisLabel: { color: labelColor, fontSize: 11 },
      axisPointer: { show: true, type: "shadow" },
    });
    yAxes.push({
      scale: true, splitArea: { show: true },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { show: true, lineStyle: { color: axisColor, type: "dashed" } },
      axisLabel: { color: labelColor, fontSize: 11, formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
      gridIndex: 0,
    });
    gridIndex++;

    // Candlestick series
    series.push({
      name: this.currentSymbol,
      type: "candlestick",
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: ohlcData,
      itemStyle: {
        color: "#22c55e", color0: "#ef4444",
        borderColor: "#22c55e", borderColor0: "#ef4444",
      },
      encode: { x: 0, y: [1, 0, 2, 3] },
    });

    // Overlay indicators on main chart (EMA, SMA, VWAP, Bollinger)
    const closes = candles.map((c) => c.close);
    this._addMainChartIndicators(series, closes, dates, currencySymbol);

    // AI overlays as markLines / markAreas
    this._addAiMarkings(series);

    // Volume sub-grid
    const volTop = `${100 - subPaneCount * subPaneHeight}%`;
    const volBottom = `${(subPaneCount - 1) * subPaneHeight}%`;
    grids.push({ left: "5%", right: "8%", top: volTop, bottom: volBottom });
    xAxes.push({
      type: "category", data: dates, scale: true,
      gridIndex: gridIndex, axisLabel: { show: false },
      boundaryGap: false, axisLine: { lineStyle: { color: axisColor } },
    });
    yAxes.push({
      scale: true, gridIndex: gridIndex,
      axisLabel: { color: labelColor, fontSize: 10 },
      axisLine: { lineStyle: { color: axisColor } },
    });
    series.push({
      name: "Volume", type: "bar", xAxisIndex: gridIndex, yAxisIndex: gridIndex, data: volumeData,
    });
    gridIndex++;

    // RSI sub-grid
    if (hasRSI) {
      const rsiParams = this.activeIndicators.get("RSI");
      const period = rsiParams?.period ?? 14;
      const rsiValues = calculateRSI(closes, period);
      const rsiTop = `${100 - (subPaneCount - 1) * subPaneHeight}%`;
      const rsiBottom = hasMACD ? `${subPaneHeight}%` : "0%";
      grids.push({ left: "5%", right: "8%", top: rsiTop, bottom: rsiBottom });
      xAxes.push({ type: "category", data: dates, scale: true, gridIndex: gridIndex, axisLabel: { show: false }, boundaryGap: false, axisLine: { lineStyle: { color: axisColor } } });
      yAxes.push({
        min: 0, max: 100, gridIndex: gridIndex,
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
        axisLabel: { color: labelColor, fontSize: 10 },
        axisLine: { lineStyle: { color: axisColor } },
      });
      series.push({
        name: `RSI(${period})`, type: "line", xAxisIndex: gridIndex, yAxisIndex: gridIndex,
        data: rsiValues.map((v) => (isNaN(v) ? null : +v.toFixed(2))),
        lineStyle: { color: "#f97316", width: 1 }, showSymbol: false, smooth: false,
        markLine: {
          silent: true, symbol: "none",
          data: [{ yAxis: 70, lineStyle: { color: "#ef4444", type: "dashed" } }, { yAxis: 30, lineStyle: { color: "#22c55e", type: "dashed" } }],
        },
      });
      gridIndex++;
    }

    // MACD sub-grid
    if (hasMACD) {
      const macdParams = this.activeIndicators.get("MACD");
      const fp = macdParams?.fastPeriod ?? 12;
      const sp = macdParams?.slowPeriod ?? 26;
      const sig = macdParams?.signalPeriod ?? 9;
      const { macd, signal, histogram } = calculateMACD(closes, fp, sp, sig);
      const macdTop = `${100}%`;
      const macdBottom = "0%";
      grids.push({ left: "5%", right: "8%", top: `${100 - subPaneHeight}%`, bottom: "0%" });
      xAxes.push({ type: "category", data: dates, scale: true, gridIndex: gridIndex, axisLabel: { show: false }, boundaryGap: false, axisLine: { lineStyle: { color: axisColor } } });
      yAxes.push({
        scale: true, gridIndex: gridIndex,
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
        axisLabel: { color: labelColor, fontSize: 10 },
        axisLine: { lineStyle: { color: axisColor } },
      });
      series.push(
        { name: "MACD", type: "line", xAxisIndex: gridIndex, yAxisIndex: gridIndex, data: macd.map((v) => isNaN(v) ? null : +v.toFixed(4)), lineStyle: { color: "#3b82f6", width: 1 }, showSymbol: false },
        { name: "Signal", type: "line", xAxisIndex: gridIndex, yAxisIndex: gridIndex, data: signal.map((v) => isNaN(v) ? null : +v.toFixed(4)), lineStyle: { color: "#f97316", width: 1 }, showSymbol: false },
        { name: "Histogram", type: "bar", xAxisIndex: gridIndex, yAxisIndex: gridIndex, data: histogram.map((v) => ({ value: isNaN(v) ? null : +v.toFixed(4), itemStyle: { color: isNaN(v) ? "transparent" : v >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)" } })) }
      );
      gridIndex++;
    }

    // DataZoom linked across all grids
    dataZoom.push(
      { type: "inside", xAxisIndex: Array.from({ length: gridIndex }, (_, i) => i), start: 60, end: 100, filterMode: "filter" },
      { type: "slider", xAxisIndex: [0], bottom: `${(subPaneCount - 1) * subPaneHeight}%`, height: 20, borderColor: axisColor, fillerColor: "rgba(255,255,255,0.05)", handleStyle: { color: axisColor } }
    );

    return {
      backgroundColor: bg,
      animation: false,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: isDark ? "#18181B" : "#FFFFFF",
        borderColor: axisColor,
        textStyle: { color: isDark ? "#E4E4E7" : "#27272A" },
        formatter: (params: any[]) => {
          if (!params?.length) return "";
          const p = params[0];
          const date = p.name;
          const ohlc = p.data;
          if (Array.isArray(ohlc)) {
            return `<div style="font-family:monospace;font-size:11px">
              <strong>${date}</strong><br/>
              O: ${currencySymbol}${ohlc[0]?.toLocaleString()}<br/>
              H: ${currencySymbol}${ohlc[3]?.toLocaleString()}<br/>
              L: ${currencySymbol}${ohlc[2]?.toLocaleString()}<br/>
              C: ${currencySymbol}${ohlc[1]?.toLocaleString()}
            </div>`;
          }
          return date;
        },
      },
      axisPointer: { link: [{ xAxisIndex: "all" }], label: { backgroundColor: "#374151" } },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
      dataZoom,
    };
  }

  private _addMainChartIndicators(
    series: any[],
    closes: number[],
    dates: string[],
    currencySymbol: string
  ): void {
    for (const [name, params] of this.activeIndicators.entries()) {
      if (name === "EMA") {
        const period = params?.period ?? 20;
        const vals = calculateEMA(closes, period);
        series.push({
          name: `EMA(${period})`, type: "line", xAxisIndex: 0, yAxisIndex: 0,
          data: vals.map((v) => (isNaN(v) ? null : +v.toFixed(4))),
          lineStyle: { color: "#22d3ee", width: 1 }, showSymbol: false, smooth: false,
        });
      }
      if (name === "SMA") {
        const period = params?.period ?? 20;
        const vals = calculateSMA(closes, period);
        series.push({
          name: `SMA(${period})`, type: "line", xAxisIndex: 0, yAxisIndex: 0,
          data: vals.map((v) => (isNaN(v) ? null : +v.toFixed(4))),
          lineStyle: { color: "#f59e0b", width: 1 }, showSymbol: false, smooth: false,
        });
      }
      if (name === "VWAP") {
        const candles = this.currentCandles;
        const vals = calculateVWAP(candles);
        series.push({
          name: "VWAP", type: "line", xAxisIndex: 0, yAxisIndex: 0,
          data: vals.map((v) => (isNaN(v) ? null : +v.toFixed(4))),
          lineStyle: { color: "#a78bfa", width: 1, type: "dashed" }, showSymbol: false, smooth: false,
        });
      }
      if (name === "BollingerBands") {
        const period = params?.period ?? 20;
        const stdDev = params?.stdDev ?? 2;
        const { upper, middle, lower } = calculateBollingerBands(closes, period, stdDev);
        [
          { vals: upper, name: "BB Upper", color: "#94a3b8" },
          { vals: middle, name: "BB Middle", color: "#64748b" },
          { vals: lower, name: "BB Lower", color: "#94a3b8" },
        ].forEach(({ vals, name: sName, color }) => {
          series.push({
            name: sName, type: "line", xAxisIndex: 0, yAxisIndex: 0,
            data: vals.map((v) => (isNaN(v) ? null : +v.toFixed(4))),
            lineStyle: { color, width: 1, type: sName === "BB Middle" ? "solid" : "dashed" },
            showSymbol: false, smooth: false,
          });
        });
      }
    }
  }

  private _addAiMarkings(series: any[]): void {
    if (!this.aiOverlays.size) return;
    const markLines: any[] = [];
    const markAreas: any[] = [];

    for (const overlay of this.aiOverlays.values()) {
      if ((overlay.type === "support" || overlay.type === "resistance") && overlay.price !== undefined) {
        markLines.push({
          name: overlay.label ?? overlay.type,
          yAxis: overlay.price,
          lineStyle: {
            color: overlay.color ?? (overlay.type === "support" ? "#22c55e" : "#ef4444"),
            type: "dashed", width: 1,
          },
          label: { show: true, formatter: `{b}: ${overlay.price}`, position: "insideEndTop" },
        });
      }
      if (overlay.type === "zone" && overlay.priceHigh !== undefined && overlay.priceLow !== undefined) {
        markAreas.push([
          { yAxis: overlay.priceLow, itemStyle: { color: overlay.color ?? "rgba(34,197,94,0.08)" } },
          { yAxis: overlay.priceHigh },
        ]);
      }
    }

    if (markLines.length || markAreas.length) {
      // Add to the candlestick series
      const candleSeries = series.find((s) => s.type === "candlestick");
      if (candleSeries) {
        if (markLines.length) candleSeries.markLine = { silent: true, symbol: "none", data: markLines };
        if (markAreas.length) candleSeries.markArea = { silent: true, data: markAreas };
      }
    }
  }

  private _renderChart(): void {
    if (!this.chart || this.destroyed) return;
    this.chart.setOption(this._buildOption(), { notMerge: false, lazyUpdate: true });
  }

  addIndicator(name: IndicatorName, params?: IndicatorParams): void {
    this.activeIndicators.set(name, params);
    this._renderChart();
  }

  removeIndicator(name: IndicatorName): void {
    this.activeIndicators.delete(name);
    this._renderChart();
  }

  setTheme(theme: "dark" | "light"): void {
    if (this.currentTheme === theme || !this.chart || !this.container) return;
    this.currentTheme = theme;
    // ECharts requires disposal and re-init for theme change
    const candles = [...this.currentCandles];
    const indicators = new Map(this.activeIndicators);
    this.chart.dispose();
    this.chart = null;
    this.initialize(this.container, this.currentSymbol, this.currentTimeframe, theme).then(() => {
      this.activeIndicators = indicators;
      if (candles.length) this.setData(candles);
    });
  }

  resize(): void {
    if (!this.chart || this.destroyed) return;
    this.chart.resize();
  }

  getVisibleRange(): VisibleRange | null {
    // ECharts doesn't expose time range directly — return based on dataZoom state
    return null;
  }

  setVisibleRange(_range: VisibleRange): void {
    // Would use chart.dispatchAction({ type: 'dataZoom' }) — deferred
  }

  addAiOverlay(overlay: AiOverlay): void {
    this.aiOverlays.set(overlay.id, overlay);
    this._renderChart();
  }

  removeAiOverlay(id: string): void {
    this.aiOverlays.delete(id);
    this._renderChart();
  }

  addDrawing(_drawing: DrawingTool): void {
    // Drawing tools via ECharts graphic elements — Phase 2 feature
  }

  removeDrawing(_id: string): void {
    // Phase 2 feature
  }

  async takeScreenshot(): Promise<string> {
    if (!this.chart) return "";
    try {
      return this.chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: this.currentTheme === "dark" ? DARK_BG : LIGHT_BG });
    } catch (_) {
      return "";
    }
  }
}
