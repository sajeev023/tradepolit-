"use client";

import { useEffect, useRef, useState } from "react";
import { useBinanceStream } from "@/hooks/useBinanceStream";

/** Format a price honestly by magnitude (crypto vs forex precision). */
export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 100) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

interface LivePriceProps {
  symbol: string;
  className?: string;
  showSymbol?: boolean;
  showChange?: boolean;
  prefix?: string;
  sizeClass?: string;
}

/**
 * LivePrice — renders a single symbol's real Binance WS price with an
 * institutional up/down tick-flash (green/red bg pulse for 320ms).
 * While the stream is connecting (null), shows a skeleton "—" — never a
 * fabricated number.
 */
export function LivePrice({
  symbol,
  className = "",
  showSymbol = false,
  showChange = false,
  prefix = "$",
  sizeClass = "text-[12px]",
}: LivePriceProps) {
  const data = useBinanceStream(symbol);
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (data == null) return;
    if (prev.current != null && data.price !== prev.current) {
      setFlash(data.price > prev.current ? "tick-flash-up" : "tick-flash-down");
      const t = setTimeout(() => setFlash(""), 340);
      prev.current = data.price;
      return () => clearTimeout(t);
    }
    prev.current = data.price;
  }, [data]);

  const change = data?.changePercent24h ?? 0;
  const up = change >= 0;

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {showSymbol && (
        <span className="font-mono font-semibold text-[var(--color-text-primary)]">{symbol}</span>
      )}
      <span
        className={`font-mono font-semibold tabular-nums text-[var(--color-text-primary)] ${sizeClass} rounded px-0.5 ${flash}`}
      >
        {data ? `${prefix}${formatPrice(data.price)}` : "—"}
      </span>
      {showChange && (
        <span
          className={`font-mono tabular-nums ${sizeClass} ${
            data ? (up ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]") : "text-[var(--color-text-quaternary)]"
          }`}
        >
          {data ? `${up ? "+" : ""}${change.toFixed(2)}%` : ""}
        </span>
      )}
    </span>
  );
}