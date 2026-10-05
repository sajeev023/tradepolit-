"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Delta, EmptyState, Label, Panel, Skeleton } from "@/components/fd/primitives";

interface MarketPulseData {
  fearGreed: {
    value: number;
    sentiment: string;
    timestamp: string;
  };
  fundingRates: Array<{
    symbol: string;
    rate: number;
    time: string;
  }>;
  trendingAssets: Array<{
    name: string;
    symbol: string;
    price: number;
    change24h: number;
  }>;
}

/* ─── Loading skeleton ─── */
function PulsePageSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
      <Skeleton className="h-24 w-72" />
      <Skeleton className="h-52 w-full" />
      <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/* ─── Fear & Greed gauge: a half-circle read from 0 (fear) to 100 (greed) ─── */
function FearGreedGauge({ value }: { value: number }) {
  // Semantic palette kept in lockstep with the landing MarketPulse component.
  const color = value >= 55 ? "var(--color-profit)" : value >= 45 ? "var(--color-warning)" : "var(--color-loss)";
  const r = 78;
  const arc = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Fear and Greed index ${value} out of 100`}>
        <path d="M 22 100 A 78 78 0 0 1 178 100" fill="none" stroke="var(--panel-3)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${arc}`}
          strokeDashoffset={arc - (clamped / 100) * arc}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="font-mono text-[44px] font-medium leading-none tabular-nums tracking-[-0.04em]" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

export default function MarketPulsePage() {
  const { data: pulseData, isLoading, refetch, isFetching } = useQuery<MarketPulseData>({
    queryKey: ["market-pulse"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/pulse");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load pulse");
      return body.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <PulsePageSkeleton />;

  const fg = pulseData?.fearGreed;
  const fgColor = !fg ? "" : fg.value >= 55 ? "var(--color-profit)" : fg.value >= 45 ? "var(--color-warning)" : "var(--color-loss)";

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Label>Market pulse</Label>
          <h1 className="mt-2 text-[var(--color-text-primary)]">
            Read the room, <em className="text-[var(--accent)]">fast.</em>
          </h1>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
            Sentiment, trending assets and perpetual funding in one glance. Refreshes every 30 seconds.
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isLoading || isFetching} className="btn-secondary self-start md:self-auto">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {pulseData && fg ? (
        <>
          <section className="card overflow-hidden">
            <div className="grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto]">
              <div>
                <Label>Fear &amp; greed index</Label>
                <h2 className="mt-3 font-serif text-[clamp(2.4rem,1.6rem+3vw,4rem)] leading-none tracking-[-0.02em]" style={{ color: fgColor }}>{fg.sentiment}</h2>
                <p className="mt-3 font-mono text-[11.5px] text-[var(--color-text-quaternary)]">Updated {new Date(fg.timestamp).toLocaleDateString()}</p>
                <div className="mt-6 flex max-w-sm items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">
                  <span>Extreme fear</span><span>Neutral</span><span>Extreme greed</span>
                </div>
                <div className="relative mt-2 h-1.5 max-w-sm rounded-full" style={{ background: "linear-gradient(90deg, var(--color-loss), var(--color-warning) 50%, var(--color-profit))" }}>
                  <span className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-text-primary)] transition-[left] duration-1000" style={{ left: `${fg.value}%`, boxShadow: "0 0 0 3px var(--panel-1)" }} />
                </div>
              </div>
              <FearGreedGauge value={fg.value} />
            </div>
          </section>

          <section>
            <Label className="mb-3 block">Trending assets</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {pulseData.trendingAssets.map((asset, idx) => (
                <div key={idx} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{asset.name}</p>
                      <p className="font-mono text-[11px] text-[var(--color-text-quaternary)]">{asset.symbol}/USD</p>
                    </div>
                    <Delta value={asset.change24h} className="text-[12px]" />
                  </div>
                  <p className="mt-5 font-mono text-[26px] font-medium leading-none tabular-nums tracking-[-0.03em] text-[var(--color-text-primary)]">${asset.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          <Panel label="Derivatives" title="Perpetual funding rates" padded={false}>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-y" style={{ borderColor: "var(--hairline)" }}>
                    <th className="px-5 py-2.5"><Label>Symbol</Label></th>
                    <th className="px-5 py-2.5"><Label>Funding rate</Label></th>
                    <th className="px-5 py-2.5 text-right"><Label>Next epoch</Label></th>
                  </tr>
                </thead>
                <tbody>
                  {pulseData.fundingRates.map((rate, idx) => (
                    <tr key={idx} className="border-b last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
                      <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-[var(--color-text-primary)]">{rate.symbol}</td>
                      <td className="px-5 py-3.5 font-mono text-[13px] tabular-nums" style={{ color: rate.rate >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}>
                        <span className="inline-flex items-center gap-1.5">
                          {rate.rate >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {rate.rate >= 0 ? "+" : ""}{(rate.rate * 100).toFixed(4)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[12px] text-[var(--color-text-tertiary)]">{new Date(rate.time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <p className="flex items-start gap-2.5 px-1 text-[11.5px] leading-relaxed text-[var(--color-text-quaternary)]">
            <Clock size={14} className="mt-0.5 shrink-0" />
            Institutional order flow (whale and block-trade data) isn&apos;t available yet — it needs a premium data provider and is on the roadmap.
          </p>
        </>
      ) : (
        <div className="card p-8 sm:p-12">
          <EmptyState
            icon={<Activity size={18} />}
            title="Market pulse unavailable"
            body="We couldn't fetch sentiment, funding or trending data right now."
            action={<button onClick={() => refetch()} className="btn-secondary btn-sm"><RefreshCw size={13} /> Retry</button>}
          />
        </div>
      )}
    </div>
  );
}
