"use client";

import { useBinanceStream } from "@/hooks/useBinanceStream";
import type { PriceData } from "@/lib/types";
import { formatPrice } from "@/lib/format-price";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { memo, useRef, useState, useEffect } from "react";

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

  // Brief bull/bear illumination on a real price tick. Direction is derived from
  // the actual previous → current price delta, never faked. Subtle (a soft tint +
  // glow that fades over ~650ms), not a distracting flash. Suppressed entirely for
  // prefers-reduced-motion users per the accessibility spec.
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  // Reset the tick baseline when the symbol changes so the first price of a new
  // market doesn't trigger a spurious up/down flash against the old market's price.
  useEffect(() => {
    prevPriceRef.current = null;
  }, [symbol]);

  useEffect(() => {
    if (!activePriceData) return;
    const price = activePriceData.price;
    const prev = prevPriceRef.current;
    if (prev !== null && price !== prev && !reduceMotionRef.current) {
      setFlash(price > prev ? "up" : "down");
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(null), 650);
    }
    prevPriceRef.current = price;
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [activePriceData?.price]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activePriceData) {
    return (
      <div className="card px-4 py-2 flex items-center gap-6 self-start md:self-auto w-[200px] h-[46px] skeleton animate-pulse" />
    );
  }

  const isProfit = activePriceData.changePercent24h >= 0;
  // Honest live-source indicator: green only when the WebSocket is actually
  // connected for this symbol; amber when we're on the polled/initial price.
  const isWsLive = !!(wsPrice && wsPrice.symbol === symbol);

  return (
    <div
      className="card px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-4 sm:gap-6 self-start md:self-auto transition-all duration-300"
      style={
        flash === "up"
          ? { borderColor: "rgba(16, 185, 129, 0.40)", boxShadow: "0 0 0 1px rgba(16, 185, 129, 0.18), 0 0 24px -6px rgba(16, 185, 129, 0.30)" }
          : flash === "down"
          ? { borderColor: "rgba(244, 63, 94, 0.40)", boxShadow: "0 0 0 1px rgba(244, 63, 94, 0.18), 0 0 24px -6px rgba(244, 63, 94, 0.30)" }
          : undefined
      }
    >
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
            {activePriceData.symbol}
          </p>
          <span
            className="inline-flex items-center"
            title={isWsLive ? "Live via WebSocket" : "Polled price — WebSocket unavailable"}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isWsLive ? "animate-pulse" : ""}`}
              style={{ background: isWsLive ? "var(--color-profit)" : "var(--color-warning)" }}
            />
          </span>
        </div>
        <p className="text-xl font-bold tp-mono mt-1 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
          {formatPrice(activePriceData.symbol, activePriceData.price)}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
          24h
        </p>
        <div className={`flex items-center gap-1 text-sm font-semibold tp-mono mt-1 ${isProfit ? "text-emerald-400" : "text-rose-500"}`}>
          {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isProfit ? "+" : ""}{activePriceData.changePercent24h.toFixed(2)}%</span>
        </div>
      </div>
      <button
        onClick={refetchPrice}
        disabled={priceFetching}
        className="p-2.5 rounded-lg transition-colors border cursor-pointer hover:bg-[var(--color-bg-hover)]"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
        aria-label="Refresh price"
      >
        <RefreshCw size={14} className={priceFetching ? "animate-spin" : ""} />
      </button>
    </div>
  );
});