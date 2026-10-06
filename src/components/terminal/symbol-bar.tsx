"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Maximize2, Minimize2, RefreshCw, Sparkles } from "lucide-react";
import { useBinanceStream } from "@/hooks/useBinanceStream";
import { formatPrice } from "@/lib/format-price";
import { SYMBOL_REGISTRY, getExchangeName } from "@/lib/market-registry";
import type { PriceData } from "@/lib/types";
import { Chip } from "@/components/fd/primitives";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

interface SymbolBarProps {
  symbol: string;
  priceData: PriceData | null;
  refetchPrice: () => void;
  priceFetching: boolean;
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onSnapshot: () => void;
  snapshotBusy: boolean;
  aiOpen: boolean;
  onToggleAi: () => void;
  /** Mobile: opens the symbol sheet. */
  onOpenSymbols: () => void;
}

/** Live price. Direction flash is derived from the real previous → current tick. */
const LivePrice = memo(function LivePrice({ symbol, fallback, refetch, fetching }: { symbol: string; fallback: PriceData | null; refetch: () => void; fetching: boolean }) {
  const ws = useBinanceStream(symbol);
  const live = ws && ws.symbol === symbol ? ws : null;
  const data = live ?? fallback;
  const prev = useRef<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    prev.current = null;
  }, [symbol]);
  useEffect(() => {
    if (!data) return;
    if (prev.current !== null && data.price !== prev.current) setDir(data.price > prev.current ? "up" : "down");
    prev.current = data.price;
  }, [data?.price]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="skeleton h-9 w-44 rounded-md" />;
  const up = data.changePercent24h >= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-baseline gap-2 whitespace-nowrap sm:gap-3">
        <span
          key={data.price}
          className={`font-mono text-[20px] font-medium leading-none tabular-nums tracking-[-0.04em] text-[var(--color-text-primary)] min-[380px]:text-[23px] sm:text-[30px] ${dir === "up" ? "tick-up" : dir === "down" ? "tick-down" : ""}`}
        >
          {formatPrice(data.symbol, data.price)}
        </span>
        <span className="font-mono text-[12px] tabular-nums min-[380px]:text-[13px]" style={{ color: up ? "var(--color-profit)" : "var(--color-loss)" }}>
          <span className="max-[379px]:hidden">{up ? "▲" : "▼"} </span>{up ? "+" : "−"}{Math.abs(data.changePercent24h).toFixed(2)}%
        </span>
      </div>
      <span className="hidden items-center gap-1.5 sm:flex" title={live ? "Live via WebSocket" : "Polled price — WebSocket unavailable"}>
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse" : ""}`} style={{ background: live ? "var(--color-profit)" : "var(--color-warning)" }} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">{live ? "Live" : "Polled"}</span>
      </span>
      <button onClick={refetch} disabled={fetching} aria-label="Refresh price" className="icon-button hidden sm:inline-flex">
        <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
      </button>
    </div>
  );
});

export const SymbolBar = memo(function SymbolBar(p: SymbolBarProps) {
  const assetClass = SYMBOL_REGISTRY[p.symbol]?.assetClass;
  return (
    <div className="@container border-b" style={{ borderColor: "var(--hairline)" }}>
    <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 @3xl:flex-row @3xl:items-center @3xl:justify-between">
      <div className="flex min-w-0 items-center justify-between gap-2 @3xl:justify-start @3xl:gap-6">
        <button
          onClick={p.onOpenSymbols}
          className="flex min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 lg:pointer-events-none lg:cursor-default lg:p-0"
          aria-label="Choose symbol"
        >
          <span className="font-mono text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] min-[380px]:text-[17px]">{p.symbol}</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            {assetClass && <Chip>{assetClass}</Chip>}
            <Chip>{getExchangeName(p.symbol)}</Chip>
          </span>
          <ChevronDown size={15} className="text-[var(--color-text-tertiary)] lg:hidden" />
        </button>
        <LivePrice symbol={p.symbol} fallback={p.priceData} refetch={p.refetchPrice} fetching={p.priceFetching} />
      </div>

      <div className="flex items-center justify-between gap-3 @3xl:justify-end">
        <div role="tablist" aria-label="Timeframe" className="timeframe-scroll-row grid min-w-0 flex-1 grid-cols-7 items-center gap-0.5 rounded-lg border p-0.5 sm:flex sm:flex-none sm:overflow-x-auto" style={{ background: "var(--panel-2)", borderColor: "var(--hairline)" }}>
          {TIMEFRAMES.map((tf) => {
            const on = tf === p.timeframe;
            return (
              <button
                key={tf}
                role="tab"
                aria-selected={on}
                onClick={() => p.onTimeframe(tf)}
                className="timeframe-pill relative h-9 min-w-0 cursor-pointer rounded-md px-0 font-mono text-[11.5px] font-medium transition-colors sm:h-8 sm:min-w-[40px] sm:shrink-0 sm:px-2.5"
                style={{ color: on ? "var(--on-accent)" : "var(--color-text-tertiary)", background: on ? "var(--accent)" : "transparent" }}
              >
                {tf}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={p.onSnapshot} disabled={p.snapshotBusy} className="icon-button" aria-label="Export setup as PNG" title="Export setup PNG">
            <Camera size={16} />
          </button>
          <span className="max-sm:hidden">
            <button onClick={p.onToggleMaximize} className="icon-button" aria-label={p.isMaximized ? "Exit fullscreen" : "Maximize chart"} title={p.isMaximized ? "Exit fullscreen" : "Maximize chart"}>
              {p.isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </span>
          <button
            onClick={p.onToggleAi}
            aria-pressed={p.aiOpen}
            className="ml-1 hidden h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] transition-colors lg:flex"
            style={{
              borderColor: p.aiOpen ? "var(--accent)" : "var(--color-border-strong)",
              background: p.aiOpen ? "rgba(var(--accent-rgb),0.1)" : "transparent",
              color: p.aiOpen ? "var(--accent)" : "var(--color-text-secondary)",
            }}
          >
            <Sparkles size={12} /> {p.aiOpen ? "Copilot on" : "Copilot off"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
});
