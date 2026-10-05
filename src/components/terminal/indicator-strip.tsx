"use client";

import { memo } from "react";
import { Label } from "@/components/fd/primitives";

interface Indicators {
  rsi?: number;
  macdValue?: number;
  macdSignal?: number;
  emaCrossover?: string;
  atr?: number;
}

const num = (v: unknown, d = 2) => (typeof v === "number" ? v.toFixed(d) : "—");

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-[120px] shrink-0 flex-col gap-1.5 border-r px-4 py-2.5 last:border-r-0 ${className}`} style={{ borderColor: "var(--hairline)" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const Locked = () => <span className="font-mono text-[12px] font-medium text-[var(--color-text-quaternary)]">PRO</span>;

/** RSI value with a 0–100 gauge; 30/70 are marked so the extremes read instantly. */
function RsiGauge({ value }: { value: number }) {
  const hot = value >= 70;
  const cold = value <= 30;
  const tone = hot ? "var(--color-loss)" : cold ? "var(--color-profit)" : "var(--color-text-primary)";
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[15px] font-medium tabular-nums" style={{ color: tone }}>{value.toFixed(1)}</span>
      <div className="relative h-1 w-16 rounded-full" style={{ background: "var(--panel-3)" }}>
        <span className="absolute top-0 h-full w-px" style={{ left: "30%", background: "var(--color-border-strong)" }} />
        <span className="absolute top-0 h-full w-px" style={{ left: "70%", background: "var(--color-border-strong)" }} />
        <span className="absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-500" style={{ left: `${Math.min(100, Math.max(0, value))}%`, background: tone }} />
      </div>
    </div>
  );
}

export const IndicatorStrip = memo(function IndicatorStrip({ data, isPro }: { data: Indicators; isPro: boolean }) {
  const ema = data.emaCrossover;
  return (
    <div id="indicator-panel" className="flex items-stretch overflow-x-auto border-t [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: "var(--hairline)", background: "var(--panel-1)" }}>
      <Cell label="RSI 14">{typeof data.rsi === "number" ? <RsiGauge value={data.rsi} /> : <span className="font-mono text-[15px]">—</span>}</Cell>
      <Cell label="MACD / Signal">
        <span className="font-mono text-[15px] font-medium tabular-nums text-[var(--color-text-primary)]">
          {num(data.macdValue)} <span className="text-[var(--color-text-quaternary)]">/</span> {num(data.macdSignal)}
        </span>
      </Cell>
      <Cell label="EMA 9 / 21">
        {isPro ? (
          <span className="font-mono text-[15px] font-medium uppercase" style={{ color: ema === "BULLISH" ? "var(--color-profit)" : ema === "BEARISH" ? "var(--color-loss)" : "var(--color-text-primary)" }}>
            {ema || "Aligned"}
          </span>
        ) : <Locked />}
      </Cell>
      <Cell label="ATR 14">{isPro ? <span className="font-mono text-[15px] font-medium tabular-nums text-[var(--color-text-primary)]">{num(data.atr)}</span> : <Locked />}</Cell>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 px-4">
        <span className="live-dot" style={{ width: 5, height: 5 }} />
        <Label>Live</Label>
      </div>
    </div>
  );
});
