"use client";

import { memo } from "react";
import { formatPrice } from "@/lib/format-price";
import { Label } from "@/components/fd/primitives";

export interface WatchGroup {
  group: string;
  items: string[];
}
interface PriceInfo {
  price: number;
  changePercent24h: number;
}
interface Overview {
  bias?: string;
  oneLiner?: string;
}

interface WatchlistRailProps {
  groups: WatchGroup[];
  selected: string;
  onSelect: (symbol: string) => void;
  prices: Record<string, PriceInfo>;
  overview: Record<string, Overview>;
  /** Mobile sheet renders larger touch rows. */
  comfortable?: boolean;
}

function biasColor(bias?: string) {
  if (!bias) return null;
  if (bias.includes("BUY") || bias.includes("LONG")) return "var(--color-profit)";
  if (bias.includes("SELL") || bias.includes("SHORT")) return "var(--color-loss)";
  return "var(--color-warning)";
}

export const WatchlistRail = memo(function WatchlistRail({ groups, selected, onSelect, prices, overview, comfortable = false }: WatchlistRailProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.group}>
          <Label className="px-3">{g.group}</Label>
          <ul className="mt-1.5 flex flex-col">
            {g.items.map((sym) => {
              const active = sym === selected;
              const info = prices[sym];
              const ovr = overview[sym];
              const tone = biasColor(ovr?.bias);
              const up = (info?.changePercent24h ?? 0) >= 0;
              return (
                <li key={sym}>
                  <button
                    onClick={() => onSelect(sym)}
                    aria-current={active ? "true" : undefined}
                    className={`group relative grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg px-3 text-left transition-colors ${comfortable ? "py-3.5" : "py-2.5"} ${active ? "" : "hover:bg-[var(--color-bg-hover)]"}`}
                    style={active ? { background: "var(--panel-3)" } : undefined}
                  >
                    {active && <span className="absolute -left-px top-2.5 bottom-2.5 w-[3px] rounded-r-full" style={{ background: "var(--accent)" }} />}
                    <span className="flex min-w-0 items-center gap-2">
                      {tone && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} title={ovr?.bias} />}
                      <span className={`truncate font-mono text-[12.5px] font-medium tracking-[-0.01em] ${active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"}`}>{sym}</span>
                    </span>
                    {info ? (
                      <span className="text-right font-mono text-[12px] tabular-nums text-[var(--color-text-primary)]">{formatPrice(sym, info.price)}</span>
                    ) : (
                      <span className="text-right font-mono text-[12px] text-[var(--color-text-quaternary)]">—</span>
                    )}
                    <span className="col-span-2 mt-0.5 flex items-start justify-between gap-3">
                      <span className="line-clamp-1 min-w-0 text-[10.5px] leading-snug text-[var(--color-text-quaternary)]">{ovr?.oneLiner ?? ""}</span>
                      {info && (
                        <span className="shrink-0 font-mono text-[10.5px] tabular-nums" style={{ color: up ? "var(--color-profit)" : "var(--color-loss)" }}>
                          {up ? "+" : ""}{info.changePercent24h.toFixed(2)}%
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
});
