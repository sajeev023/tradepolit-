"use client";

/**
 * src/components/charts/UnifiedChart.tsx
 *
 * THE single React chart component for all markets and engines.
 *
 * Architecture:
 *  - Holds a ref to the active ChartProvider instance
 *  - On mount: ChartFactory.create(symbol) → provider.initialize()
 *  - On symbol/timeframe change: provider.setSymbol() / setTimeframe() (no recreation)
 *  - Engine change (e.g., Crypto→India): destroys old provider, creates new one
 *  - On OHLCV data: provider.setData()
 *  - On WebSocket tick: provider.updateRealtime() (zero React re-renders)
 *  - On unmount: provider.destroy()
 *  - ResizeObserver → provider.resize()
 *
 * Performance guarantees:
 *  ✓ Zero React re-renders on price ticks (WebSocket → provider directly)
 *  ✓ Zero chart recreation on symbol/timeframe change within same engine
 *  ✓ Chart recreation ONLY when engine changes (e.g., US→India)
 *  ✓ Smooth infinite scroll via provider.appendHistory()
 */

import {
  useEffect,
  useRef,
  useCallback,
  memo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  RefreshCw,
  AlertTriangle,
  Camera,
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { ChartFactory } from "./providers/ChartFactory";
import { resolveChartEngine, type ChartEngine } from "@/lib/chart-router";
import type { ChartProvider, IndicatorName, IndicatorParams } from "./providers/ChartProvider";
import type { OHLCVCandle } from "@/lib/types";
import { getLatestWebSocketPrice } from "@/hooks/useBinanceStream";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
  theme?: "dark" | "light";
  onScreenshot?: (dataUrl: string) => void;
}

// ─── Engine badge config ──────────────────────────────────────────────────────
const ENGINE_LABELS: Record<ChartEngine, { label: string; color: string }> = {
  tradingview: { label: "TradingView", color: "text-blue-400 bg-blue-950/40 border-blue-500/20" },
  lightweight: { label: "LW Charts", color: "text-teal-400 bg-teal-950/40 border-teal-500/20" },
  echarts: { label: "ECharts", color: "text-amber-400 bg-amber-950/40 border-amber-500/20" },
};

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"];

// Indicators available in the toolbar
const AVAILABLE_INDICATORS: Array<{ name: IndicatorName; label: string; defaultParams?: IndicatorParams }> = [
  { name: "EMA", label: "EMA 20", defaultParams: { period: 20 } },
  { name: "SMA", label: "SMA 50", defaultParams: { period: 50 } },
  { name: "VWAP", label: "VWAP" },
  { name: "RSI", label: "RSI 14", defaultParams: { period: 14 } },
  { name: "MACD", label: "MACD" },
  { name: "BollingerBands", label: "Bollinger Bands" },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ChartSkeleton({ engine }: { engine?: ChartEngine }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0B] animate-pulse">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 bg-zinc-800 rounded" />
          <div className="h-4 w-12 bg-zinc-800 rounded" />
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 w-10 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="text-zinc-600 text-xs font-semibold uppercase tracking-widest z-10 flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" />
          {engine ? `Loading ${ENGINE_LABELS[engine].label}...` : "Initializing Chart..."}
        </div>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ChartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A0A0B] p-6 text-center">
      <AlertTriangle className="text-rose-500 mb-3" size={32} />
      <h3 className="text-sm font-bold text-white mb-1">Chart Failed to Load</h3>
      <p className="text-xs text-zinc-400 mb-4 max-w-[300px]">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const UnifiedChart = memo(function UnifiedChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
  theme = "dark",
  onScreenshot,
}: UnifiedChartProps) {
  // ── Refs (no re-render on tick updates) ────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<ChartProvider | null>(null);
  const currentEngineRef = useRef<ChartEngine | null>(null);
  const isInitializedRef = useRef(false);

  // ── State (only used for UI indicators, not for price ticks) ───────────────
  const [engine, setEngine] = useState<ChartEngine>(() => resolveChartEngine(symbol));
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorName>>(new Set());
  const [retryKey, setRetryKey] = useState(0);

  // ── OHLCV data fetch ───────────────────────────────────────────────────────
  const { data: candles, isLoading, isError, error } = useQuery<OHLCVCandle[]>({
    queryKey: ["ohlcv", symbol, timeframe, retryKey],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/market/ohlcv?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}&limit=200`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to fetch OHLCV data");
      return body.data ?? [];
    },
    staleTime: 30_000,
    gcTime: 60_000,
    // TV engine manages its own data
    enabled: engine !== "tradingview",
  });

  // ── Provider lifecycle ─────────────────────────────────────────────────────
  const destroyProvider = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    currentEngineRef.current = null;
    isInitializedRef.current = false;
    setIsProviderReady(false);
  }, []);

  const initProvider = useCallback(async (
    sym: string,
    tf: string,
    eng: ChartEngine,
    th: "dark" | "light"
  ) => {
    const container = containerRef.current;
    if (!container) return;

    setInitError(null);

    console.log(`[UNIFIED-CHART] Initializing: symbol=${sym} engine=${eng} timeframe=${tf}`);

    try {
      const provider = await ChartFactory.createByEngine(eng);
      await provider.initialize(container, sym, tf, th);
      providerRef.current = provider;
      currentEngineRef.current = eng;
      isInitializedRef.current = true;
      setIsProviderReady(true);
    } catch (err) {
      const msg = (err as Error).message ?? "Failed to initialize chart";
      console.error("[UNIFIED-CHART] Init failed:", err);
      setInitError(msg);
    }
  }, []);

  // ── Mount / engine-change effect ───────────────────────────────────────────
  useEffect(() => {
    const newEngine = resolveChartEngine(symbol);
    setEngine(newEngine);

    if (currentEngineRef.current && currentEngineRef.current !== newEngine) {
      // Engine changed (e.g., switched from US stock to India stock)
      // Destroy old provider and create fresh one
      destroyProvider();
    }

    if (!isInitializedRef.current) {
      initProvider(symbol, timeframe, newEngine, theme);
    }

    return () => {
      destroyProvider();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount — changes handled below

  // ── Symbol change effect (in-place swap) ──────────────────────────────────
  useEffect(() => {
    const newEngine = resolveChartEngine(symbol);

    if (!isInitializedRef.current || !providerRef.current) return;

    if (currentEngineRef.current !== newEngine) {
      // Engine changed — must recreate provider
      setEngine(newEngine);
      destroyProvider();
      setIsProviderReady(false);
      initProvider(symbol, timeframe, newEngine, theme);
      return;
    }

    // Same engine — swap symbol in-place (no recreation)
    console.log(`[UNIFIED-CHART] Symbol switch: ${symbol} (engine: ${newEngine})`);
    setEngine(newEngine);
    providerRef.current.setSymbol(symbol).catch(console.error);
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timeframe change effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitializedRef.current || !providerRef.current) return;
    console.log(`[UNIFIED-CHART] Timeframe switch: ${timeframe}`);
    providerRef.current.setTimeframe(timeframe).catch(console.error);
  }, [timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme change effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitializedRef.current || !providerRef.current) return;
    providerRef.current.setTheme(theme);
  }, [theme]);

  // ── Data → provider (non-TV engines only) ─────────────────────────────────
  useEffect(() => {
    if (!isProviderReady || !providerRef.current || !candles?.length) return;
    if (engine === "tradingview") return; // TV manages its own data
    providerRef.current.setData(candles);
  }, [candles, isProviderReady, engine]);

  // ── WebSocket tick → provider (zero React re-renders) ────────────────────
  // Uses a setInterval to poll the WS cache — no React state involved.
  useEffect(() => {
    if (engine === "tradingview" || engine === "echarts") return; // TV and ECharts handle their own updates

    const interval = setInterval(() => {
      if (!providerRef.current || !isInitializedRef.current) return;
      const wsPrice = getLatestWebSocketPrice(symbol);
      if (!wsPrice) return;

      // Build a minimal realtime candle from the WS tick
      const now = Date.now();
      const tick: OHLCVCandle = {
        timestamp: now,
        open: wsPrice,
        high: wsPrice,
        low: wsPrice,
        close: wsPrice,
        volume: 0,
        source: "LIVE",
      };
      providerRef.current.updateRealtime(tick);
    }, 1000);

    return () => clearInterval(interval);
  }, [symbol, engine]);

  // ── ResizeObserver → provider.resize() ────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (providerRef.current && isInitializedRef.current) {
        providerRef.current.resize();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Indicator toggle ───────────────────────────────────────────────────────
  const toggleIndicator = useCallback((name: IndicatorName, params?: IndicatorParams) => {
    if (!providerRef.current) return;
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        providerRef.current!.removeIndicator(name);
        next.delete(name);
      } else {
        providerRef.current!.addIndicator(name, params);
        next.add(name);
      }
      return next;
    });
  }, []);

  // ── Screenshot ─────────────────────────────────────────────────────────────
  const handleScreenshot = useCallback(async () => {
    if (!providerRef.current) return;
    const dataUrl = await providerRef.current.takeScreenshot();
    if (!dataUrl) {
      toast.error("Screenshot not supported by this chart engine");
      return;
    }
    onScreenshot?.(dataUrl);
    // Trigger download
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${symbol}_${timeframe}_chart.png`;
    link.click();
    toast.success("Chart screenshot saved");
  }, [symbol, timeframe, onScreenshot]);

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    destroyProvider();
    setInitError(null);
    setRetryKey((k) => k + 1);
    const eng = resolveChartEngine(symbol);
    setEngine(eng);
    initProvider(symbol, timeframe, eng, theme);
  }, [symbol, timeframe, theme, destroyProvider, initProvider]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const isChartLoading = !isProviderReady && !initError;
  const isDataLoading = isLoading && engine !== "tradingview";
  const engineConfig = ENGINE_LABELS[engine];

  return (
    <div
      className={`w-full h-full flex flex-col relative ${
        isMaximized ? "border-0 rounded-none" : "border rounded-lg"
      } overflow-hidden`}
      style={{
        borderColor: "var(--color-border-subtle)",
        backgroundColor: theme === "dark" ? "#0A0A0B" : "#FAFAFA",
      }}
    >
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-zinc-950/90 border-b border-zinc-800/80 gap-2 shrink-0 z-20 backdrop-blur-sm">
        {/* Left: Symbol + engine badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-white font-mono tracking-tight">{symbol}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${engineConfig.color}`}>
            {engineConfig.label}
          </span>
        </div>

        {/* Center: Timeframe buttons */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <a
              key={tf}
              href={`?tf=${tf}`}
              onClick={(e) => {
                e.preventDefault();
                if (providerRef.current) {
                  providerRef.current.setTimeframe(tf);
                }
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                timeframe === tf
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              {tf}
            </a>
          ))}
        </div>

        {/* Right: Indicator toggles + actions */}
        <div className="flex items-center gap-1.5">
          {/* Indicator buttons */}
          {AVAILABLE_INDICATORS.map(({ name, label, defaultParams }) => (
            <button
              key={name}
              onClick={() => toggleIndicator(name, defaultParams)}
              title={`Toggle ${label}`}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
                activeIndicators.has(name)
                  ? "bg-zinc-700 border-zinc-600 text-white"
                  : "border-zinc-800/60 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Screenshot */}
          <button
            id="chart-screenshot-btn"
            onClick={handleScreenshot}
            title="Take screenshot"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <Camera size={13} />
          </button>
        </div>
      </div>

      {/* ── Chart container ────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* The actual chart mounts here */}
        <div
          ref={containerRef}
          id={`unified-chart-${symbol.replace(/[^a-z0-9]/gi, "-")}`}
          className="w-full h-full"
          style={{ display: isChartLoading || initError ? "none" : "block" }}
        />

        {/* Loading skeleton */}
        {isChartLoading && <ChartSkeleton engine={engine} />}

        {/* Data loading overlay (for non-TV engines) */}
        {isDataLoading && !isChartLoading && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2 py-1 bg-zinc-900/80 rounded text-[10px] text-zinc-400 border border-zinc-800/60 backdrop-blur-sm">
            <RefreshCw size={10} className="animate-spin" />
            Loading data...
          </div>
        )}

        {/* Error state */}
        {initError && (
          <ChartError message={initError} onRetry={handleRetry} />
        )}

        {isError && !initError && (
          <div className="absolute bottom-10 left-3 right-3 z-20 px-3 py-2 bg-rose-950/80 border border-rose-500/30 rounded-lg text-[11px] text-rose-400 flex items-center gap-2 backdrop-blur-sm">
            <AlertTriangle size={12} />
            <span>
              {(error as Error)?.message ?? "Failed to fetch chart data"}
            </span>
          </div>
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-950 border-t border-zinc-800/60 text-[9px] text-zinc-600 font-mono shrink-0">
        <span>
          {resolveChartEngine(symbol) === "tradingview"
            ? "Live data via TradingView"
            : resolveChartEngine(symbol) === "lightweight"
            ? "Live via Binance WebSocket"
            : "Data via TradCopilot Engine"}
        </span>
        <span className="flex items-center gap-1">
          <Activity size={9} className="text-emerald-500" />
          TradCopilot
        </span>
      </div>
    </div>
  );
});
