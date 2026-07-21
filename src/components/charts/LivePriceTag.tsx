"use client";

import { useBinanceStream } from "@/hooks/useBinanceStream";
import type { PriceData } from "@/lib/types";
import { memo } from "react";

interface LivePriceTagProps {
  symbol: string;
  initialPriceData: PriceData | null;
}

export const LivePriceTag = memo(function LivePriceTag({
  symbol,
  initialPriceData,
}: LivePriceTagProps) {
  const wsPrice = useBinanceStream(symbol);
  
  // Prefer WebSocket price, fallback to HTTP polled price
  const activePriceData = (wsPrice && wsPrice.symbol === symbol) ? wsPrice : initialPriceData;

  if (!activePriceData) return null;

  const isProfit = activePriceData.changePercent24h >= 0;

  return (
    <div className="flex items-baseline gap-1.5 bg-[var(--color-bg-tertiary)] px-2.5 py-1 rounded-md border border-[var(--color-border-default)]">
      <span className="text-xs font-semibold font-mono text-[var(--color-text-primary)] tabular-nums" style={{ letterSpacing: "-0.02em" }}>
        ${symbol.includes("JPY") || symbol.includes("NASDAQ") || symbol.includes("S&P500") || symbol.includes("XAU")
          ? activePriceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : activePriceData.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
      </span>
      <span className={`text-[10px] font-semibold font-mono tabular-nums ${isProfit ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
        {isProfit ? "+" : ""}{activePriceData.changePercent24h.toFixed(2)}%
      </span>
    </div>
  );
});
