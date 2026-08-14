"use client";

import { useBinanceStream } from "@/hooks/useBinanceStream";

/* Live BTC price for the editorial masthead — public Binance WS, no auth.
   Renders an em-dash while the first tick is pending so we never fabricate a
   number. This is the one piece of live data in the masthead dateline. */
function fmt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function MastheadPrice() {
  const live = useBinanceStream("BTC/USD");
  const price = live?.price;
  const change = live?.changePercent24h;

  return (
    <span className="tp-masthead__live">
      BTC&nbsp;${fmt(price)}
      {change != null && (
        <span
          className={`tabular-nums ${
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