"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle, Clock } from "lucide-react";
import type { OHLCVCandle } from "@/lib/types";

interface LightweightChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
}

export function LightweightChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
}: LightweightChartProps) {
  console.log(`[LIGHTWEIGHT-CHART-MOUNTED] ✓ LightweightChart rendered for symbol=${symbol}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Fetch OHLCV candles directly from TradCopilot backend MarketDataService
  const { data: candles = [], isLoading, isError, error, refetch } = useQuery<OHLCVCandle[]>({
    queryKey: ["ohlcv", symbol, timeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/market/ohlcv?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}&limit=100`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load candle data");
      return body.data || [];
    },
    staleTime: 30000,
    gcTime: 60000,
  });

  // Calculate EMA 9 & EMA 21 for technical overlay
  const { ema9, ema21, minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { ema9: [], ema21: [], minPrice: 0, maxPrice: 100, maxVolume: 100 };
    }

    const closes = candles.map((c) => c.close);
    const minP = Math.min(...candles.map((c) => c.low));
    const maxP = Math.max(...candles.map((c) => c.high));
    const maxV = Math.max(...candles.map((c) => c.volume || 1));

    // EMA calculation helper
    const calcEMA = (period: number) => {
      const k = 2 / (period + 1);
      const result: number[] = [];
      let prev = closes[0];
      for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
          result.push(prev);
        } else {
          const val = closes[i] * k + prev * (1 - k);
          result.push(val);
          prev = val;
        }
      }
      return result;
    };

    return {
      ema9: calcEMA(9),
      ema21: calcEMA(21),
      minPrice: minP * 0.998,
      maxPrice: maxP * 1.002,
      maxVolume: maxV,
    };
  }, [candles]);

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  if (isError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A0A0B] p-6 text-center border border-[var(--color-border-subtle)] rounded-lg">
        <AlertTriangle className="text-amber-400 mb-3" size={32} />
        <h3 className="text-sm font-bold text-white mb-1">Unable to Load Chart Data</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-[320px]">
          {(error as Error)?.message || "Failed to fetch OHLCV candle data from market service."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Retry Chart Fetch
        </button>
      </div>
    );
  }

  if (isLoading || !candles || candles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-4 bg-[#0A0A0B] border border-[var(--color-border-subtle)] rounded-lg animate-pulse">
        <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1C]">
          <div className="flex items-center gap-3">
            <div className="h-6 w-28 bg-zinc-800 rounded" />
            <div className="h-4 w-16 bg-zinc-800 rounded" />
          </div>
          <div className="h-5 w-20 bg-zinc-800 rounded" />
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin text-teal-400" />
            Loading Native Market Chart...
          </div>
        </div>
      </div>
    );
  }

  // SVG Chart Dimensions
  const chartHeight = 400;
  const priceHeight = 300;
  const volumeHeight = 80;
  const candleCount = candles.length;
  const priceRange = Math.max(0.0001, maxPrice - minPrice);

  const getY = (val: number) => {
    return priceHeight - ((val - minPrice) / priceRange) * (priceHeight - 20);
  };

  const getVolY = (vol: number) => {
    const ratio = maxVolume > 0 ? vol / maxVolume : 0;
    return chartHeight - ratio * volumeHeight;
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative flex flex-col ${
        isMaximized ? "border-0 rounded-none" : "border rounded-lg"
      } overflow-hidden bg-[#0A0A0B] border-[var(--color-border-subtle)] select-none`}
    >
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 gap-2 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white font-mono">{symbol}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
            {timeframe}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
            Native Telemetry
          </span>
        </div>

        {/* Dynamic O/H/L/C telemetry readout */}
        {activeCandle && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-300">
            <span>O: <strong className="text-white">${activeCandle.open?.toLocaleString()}</strong></span>
            <span>H: <strong className="text-emerald-400">${activeCandle.high?.toLocaleString()}</strong></span>
            <span>L: <strong className="text-rose-400">${activeCandle.low?.toLocaleString()}</strong></span>
            <span>C: <strong className="text-white">${activeCandle.close?.toLocaleString()}</strong></span>
            {activeCandle.volume ? (
              <span className="hidden sm:inline">V: <strong className="text-teal-400">{Math.round(activeCandle.volume).toLocaleString()}</strong></span>
            ) : null}
          </div>
        )}
      </div>

      {/* Legend / Overlay info */}
      <div className="absolute top-12 left-4 z-10 flex items-center gap-3 text-[10px] font-mono bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded border border-zinc-800/60">
        <span className="flex items-center gap-1 text-cyan-400">
          <span className="w-2 h-0.5 bg-cyan-400 rounded-full" /> EMA 9
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-0.5 bg-amber-400 rounded-full" /> EMA 21
        </span>
      </div>

      {/* Main SVG Candlestick & Volume Chart */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 1000 ${chartHeight}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const y = priceHeight * ratio;
            const priceVal = maxPrice - ratio * priceRange;
            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={y}
                  x2="1000"
                  y2={y}
                  stroke="#1A1A1E"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x="990"
                  y={y - 4}
                  fill="#52525b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  ${priceVal > 10 ? priceVal.toFixed(2) : priceVal.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks + Volume Bars */}
          {candles.map((c, i) => {
            const width = 1000 / candleCount;
            const x = i * width + width * 0.15;
            const candleW = width * 0.7;
            const isGreen = c.close >= c.open;
            const color = isGreen ? "#22c55e" : "#ef4444";

            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
            const volY = getVolY(c.volume || 0);

            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                {/* Volume Bar */}
                <rect
                  x={x}
                  y={volY}
                  width={candleW}
                  height={chartHeight - volY}
                  fill={isGreen ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"}
                  rx="1"
                />

                {/* Wick */}
                <line
                  x1={x + candleW / 2}
                  y1={highY}
                  x2={x + candleW / 2}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x}
                  y={bodyY}
                  width={candleW}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* EMA 9 Line */}
          <path
            d={ema9.map((val, idx) => `${idx === 0 ? "M" : "L"} ${(idx / (candleCount - 1)) * 1000} ${getY(val)}`).join(" ")}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.5"
          />

          {/* EMA 21 Line */}
          <path
            d={ema21.map((val, idx) => `${idx === 0 ? "M" : "L"} ${(idx / (candleCount - 1)) * 1000} ${getY(val)}`).join(" ")}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Footer Timestamp & Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-950 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-teal-400" />
          <span>Last candle: {activeCandle?.timestamp ? new Date(activeCandle.timestamp).toLocaleTimeString() : "—"}</span>
        </div>
        <span>TradCopilot Centralized Data Engine</span>
      </div>
    </div>
  );
}
