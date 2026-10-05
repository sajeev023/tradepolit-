"use client";

import { Label } from "@/components/fd/primitives";

interface TradeLadderProps {
  direction: "LONG" | "SHORT";
  entry: number;
  stop: number;
  target?: number;
  /** Dollar risk / reward from the risk engine — shown on the zones when provided. */
  riskLabel?: string;
  rewardLabel?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 5 });

/**
 * Vertical price ladder drawn to scale from the user's own entry / stop / target.
 * Pure geometry — no data of its own. Higher price is always higher on screen.
 */
export function TradeLadder({ direction, entry, stop, target, riskLabel, rewardLabel }: TradeLadderProps) {
  const prices = [entry, stop, ...(target !== undefined ? [target] : [])];
  const hi = Math.max(...prices);
  const lo = Math.min(...prices);
  const span = hi - lo || 1;
  // Keep markers off the very edges so labels never clip.
  const y = (p: number) => 8 + ((hi - p) / span) * 84;

  const rows: Array<{ key: string; label: string; price: number; color: string }> = [
    { key: "entry", label: "Entry", price: entry, color: "var(--color-text-primary)" },
    { key: "stop", label: "Stop", price: stop, color: "var(--color-loss)" },
    ...(target !== undefined ? [{ key: "tp", label: "Target", price: target, color: "var(--color-profit)" }] : []),
  ];

  const lossTop = Math.min(y(entry), y(stop));
  const lossH = Math.abs(y(entry) - y(stop));
  const gainTop = target !== undefined ? Math.min(y(entry), y(target)) : 0;
  const gainH = target !== undefined ? Math.abs(y(entry) - y(target)) : 0;

  return (
    <div className="relative h-[230px] w-full" role="img" aria-label={`${direction} trade ladder: entry ${fmt(entry)}, stop ${fmt(stop)}${target !== undefined ? `, target ${fmt(target)}` : ""}`}>
      {/* track */}
      <div className="absolute bottom-0 left-[84px] top-0 w-px" style={{ background: "var(--color-border-strong)" }} />
      {/* zones */}
      <div className="absolute left-[84px] w-[18px]" style={{ top: `${lossTop}%`, height: `${lossH}%`, background: "var(--color-loss-bg)", borderRight: "2px solid var(--color-loss)" }} />
      {target !== undefined && (
        <div className="absolute left-[84px] w-[18px]" style={{ top: `${gainTop}%`, height: `${gainH}%`, background: "var(--color-profit-bg)", borderRight: "2px solid var(--color-profit)" }} />
      )}
      {riskLabel && (
        <span className="absolute left-[112px] font-mono text-[11px]" style={{ top: `calc(${lossTop + lossH / 2}% - 7px)`, color: "var(--color-loss)" }}>
          −{riskLabel} at risk
        </span>
      )}
      {rewardLabel && target !== undefined && (
        <span className="absolute left-[112px] font-mono text-[11px]" style={{ top: `calc(${gainTop + gainH / 2}% - 7px)`, color: "var(--color-profit)" }}>
          +{rewardLabel} to target
        </span>
      )}
      {/* markers */}
      {rows.map((r) => (
        <div key={r.key} className="absolute left-0 flex w-[110px] items-center gap-2 transition-[top] duration-500" style={{ top: `calc(${y(r.price)}% - 8px)` }}>
          <div className="w-[76px] text-right">
            <Label className="!text-[9px]">{r.label}</Label>
            <p className="font-mono text-[11.5px] leading-none tabular-nums" style={{ color: r.color }}>{fmt(r.price)}</p>
          </div>
          <span className="h-[2px] w-3" style={{ background: r.color }} />
        </div>
      ))}
      <span className="absolute -top-1 left-[104px] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">
        {direction} · price ↑
      </span>
    </div>
  );
}
