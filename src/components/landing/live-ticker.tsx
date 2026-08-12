"use client";

import { useEffect, useRef, useState } from "react";
import { useBinanceStream } from "@/hooks/useBinanceStream";
import { InfiniteMarquee } from "@/components/ui/infinite-marquee";
import { formatPrice } from "./live-price";

const TICKER_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/USD"];

function TickerChip({ symbol }: { symbol: string }) {
  const data = useBinanceStream(symbol);
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
    <div className="flex items-center gap-2.5 border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-1.5 rounded-full">
      <span className="flex items-center gap-1.5">
        <span className="ping-dot" style={{ width: 5, height: 5 }} />
        <span className="text-[12px] font-semibold font-mono text-[var(--color-text-primary)]">{symbol}</span>
      </span>
      <span className={`font-mono tabular-nums text-[12px] text-[var(--color-text-secondary)] rounded px-0.5 ${flash}`}>
        {mounted && data ? `$${formatPrice(data.price)}` : "—"}
      </span>
      <span
        className={`text-[11px] font-mono font-medium tabular-nums ${
          mounted && data ? (up ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]") : "text-[var(--color-text-quaternary)]"
        }`}
      >
        {mounted && data ? `${up ? "+" : ""}${change.toFixed(2)}%` : "···"}
      </span>
    </div>
  );
}

/** Skeleton chip rendered before hydration / while connecting. */
// (each TickerChip already shows "—" until the stream lands — no separate
//  skeleton is needed, and showing "—" matches SSR so there is no hydration
//  mismatch when the live value arrives.)

export function LiveTicker() {
  return (
    <InfiniteMarquee direction="left">
      {TICKER_SYMBOLS.map((sym) => (
        <TickerChip key={sym} symbol={sym} />
      ))}
    </InfiniteMarquee>
  );
}