"use client";

import { useBinanceMultiStream } from "@/hooks/useBinanceStream";
import type { PriceData } from "@/lib/types";

// Supported live WebSocket symbols (Binance spot). GBP/USD removed as Binance does not carry GBPUSDT.
const TICKER_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD"];

function fmtPrice(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function TickerItem({ symbol, data }: { symbol: string; data: PriceData | null }) {
  const price = data?.price;
  const pct = data?.changePercent24h;
  const up = (pct ?? 0) >= 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border-default)] bg-[var(--surface)] whitespace-nowrap">
      <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">{symbol}</span>
      {price != null && Number.isFinite(price) ? (
        <>
          <span className="text-[11px] font-mono tabular-nums text-[var(--muted)]">
            ${fmtPrice(price)}
          </span>
          {pct != null && (
            <span
              className={`text-[11px] font-mono tabular-nums font-medium ${
                up ? "text-[var(--green)]" : "text-[var(--red)]"
              }`}
            >
              {up ? "+" : ""}{pct.toFixed(2)}%
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          live
        </span>
      )}
    </div>
  );
}

/**
 * LiveTicker — a seamless marquee of GENUINELY live prices pulled from the
 * shared Binance WebSocket registry (public, no auth).
 */
export function LiveTicker() {
  const prices = useBinanceMultiStream(TICKER_SYMBOLS);
  const items = TICKER_SYMBOLS.map((s) => ({ symbol: s, data: prices[s] ?? null }));

  return (
    <div className="marquee-container relative overflow-hidden w-full select-none">
      <div className="flex w-max animate-marquee-left">
        <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={false}>
          {items.map((it) => (
            <TickerItem key={it.symbol} {...it} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={true}>
          {items.map((it) => (
            <TickerItem key={`${it.symbol}-dup`} {...it} />
          ))}
        </div>
      </div>
      {/* Edge fade masks matched to the band surface */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--bg-band)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--bg-band)] to-transparent" />
    </div>
  );
}