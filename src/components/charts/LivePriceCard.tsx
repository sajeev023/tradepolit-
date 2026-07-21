"use client";

import { useBinanceStream } from "@/hooks/useBinanceStream";
import type { PriceData } from "@/lib/types";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { memo } from "react";

interface LivePriceCardProps {
  symbol: string;
  initialPriceData: PriceData | null;
  refetchPrice: () => void;
  priceFetching: boolean;
}

export const LivePriceCard = memo(function LivePriceCard({
  symbol,
  initialPriceData,
  refetchPrice,
  priceFetching,
}: LivePriceCardProps) {
  const wsPrice = useBinanceStream(symbol);
  
  // Prefer WebSocket real-time price, fall back to initial/REST polled price
  const activePriceData = (wsPrice && wsPrice.symbol === symbol) ? wsPrice : initialPriceData;

  if (!activePriceData) {
    return (
      <div className="card px-4 py-2 flex items-center gap-6 self-start md:self-auto w-[200px] h-[46px] skeleton animate-pulse" />
    );
  }

  const isProfit = activePriceData.changePercent24h >= 0;

  return (
    <div className="card px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-4 sm:gap-6 self-start md:self-auto shadow-md rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
          {activePriceData.symbol}
        </p>
        <p className="text-xl font-bold font-mono tabular-nums mt-1 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
          {symbol.includes("JPY") || symbol.includes("NASDAQ") || symbol.includes("S&P500") || symbol.includes("XAU")
            ? activePriceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : activePriceData.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-tertiary)" }}>24h Change</p>
        <div className={`flex items-center gap-1 text-sm font-semibold tabular-nums mt-1 ${isProfit ? "text-emerald-400" : "text-rose-500"}`}>
          {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isProfit ? "+" : ""}{activePriceData.changePercent24h.toFixed(2)}%</span>
        </div>
      </div>
      <button
        onClick={refetchPrice}
        disabled={priceFetching}
        className="p-2.5 rounded-lg transition-colors border cursor-pointer border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Refresh price"
      >
        <RefreshCw size={14} className={priceFetching ? "animate-spin" : ""} />
      </button>
    </div>
  );
});
