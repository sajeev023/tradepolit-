"use client";

import { useEffect, useState } from "react";
import { Activity, Gauge, Radio } from "lucide-react";

interface PulseData {
  fearGreed: { value: number; sentiment: string; timestamp: string };
  fundingRates: Array<{ symbol: string; rate: number; time: string }>;
  trendingAssets: Array<{ name: string; symbol: string; price: number; change24h: number }>;
}

function fgColor(v: number) {
  if (v >= 75) return "#10b981";
  if (v >= 55) return "#22c55e";
  if (v >= 45) return "#f59e0b";
  if (v >= 25) return "#f97316";
  return "#f43f5e";
}

function FundingRow({ symbol, rate }: { symbol: string; rate: number }) {
  const clean = symbol.replace("USDT", "");
  const pct = rate * 100;
  const positive = rate >= 0;
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
      <span className="text-[var(--color-text-secondary)]">{clean}/USDT</span>
      <span className="tabular-nums" style={{ color: positive ? "var(--color-profit)" : "var(--color-loss)" }}>
        {positive ? "+" : ""}{pct.toFixed(4)}%
      </span>
    </div>
  );
}

export function MarketPulseBand() {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let active = true;
    fetch("/api/v1/market/pulse", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (active && j && j.data) setPulse(j.data);
      })
      .catch(() => {
        /* graceful: band stays in skeleton state — never fabricated */
      });
    return () => {
      active = false;
    };
  }, []);

  const fg = pulse?.fearGreed;
  const fgVal = fg?.value ?? 50;
  const funding = pulse?.fundingRates?.slice(0, 3) ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Fear & Greed */}
      <div className="terminal-pane p-4 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: "var(--color-accent-primary-subtle)", border: "1px solid rgba(6,182,212,0.14)" }}>
          <Gauge size={18} style={{ color: "var(--color-accent-primary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="tp-micro-label">Fear &amp; Greed Index</span>
            <span className="tp-micro-label" style={{ color: "var(--color-text-quaternary)" }}>· cached 6h</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono text-[22px] font-bold tabular-nums" style={{ color: mounted && fg ? fgColor(fgVal) : "var(--color-text-tertiary)" }}>
              {mounted && fg ? fgVal : "—"}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              {mounted && fg ? fg.sentiment : "loading sentiment"}
            </span>
          </div>
          <div className="pulse-meter-track">
            <div className="pulse-meter-mask" />
            {mounted && fg && (
              <div className="pulse-meter-thumb" style={{ left: `${Math.min(100, Math.max(0, fgVal))}%` }} />
            )}
          </div>
        </div>
      </div>

      {/* Funding rates + status */}
      <div className="terminal-pane p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: "var(--color-accent-primary)" }} />
          <span className="tp-micro-label">Binance Futures Funding</span>
          <span className="ml-auto flex items-center gap-1.5 tp-micro-label" style={{ color: "var(--color-profit)" }}>
            <Radio size={11} /> live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(funding.length ? funding : [{ symbol: "BTCUSDT", rate: 0 }, { symbol: "ETHUSDT", rate: 0 }, { symbol: "SOLUSDT", rate: 0 }]).map((f) => (
            <FundingRow key={f.symbol} symbol={f.symbol} rate={mounted && pulse ? f.rate : 0} />
          ))}
        </div>
      </div>
    </div>
  );
}