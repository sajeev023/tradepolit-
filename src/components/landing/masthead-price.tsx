"use client";

import { useBinanceStream } from "@/hooks/useBinanceStream";

/* Live BTC price for the editorial masthead — public Binance WS, no auth.
   Renders a subtle pulsing "BTC · live" chip while the first tick is pending
   so we never display a dash or zero. When data arrives, the live price fades in. */
export function MastheadPrice() {
  const live = useBinanceStream("BTC/USD");
  const price = live?.price;
  const change = live?.changePercent24h;

  if (price == null || !Number.isFinite(price) || price <= 0) {
    return (
      <span className="tp-masthead__live inline-flex items-center gap-1.5">
        BTC · live
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_6px_rgba(var(--accent-rgb),0.6)]"
          style={{ animationDuration: "1.2s" }}
        />
      </span>
    );
  }

  return (
    <span className="tp-masthead__live inline-flex items-center transition-opacity duration-150 ease-out">
      BTC&nbsp;${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      {change != null && (
        <span
          className={`tabular-nums ml-1.5 ${
            change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      )}
    </span>
  );
}