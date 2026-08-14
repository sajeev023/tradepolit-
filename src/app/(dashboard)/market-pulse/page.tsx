"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

/* ─── Loading Skeleton ─── */
function PulsePageSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="animate-fade-in">
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 skeleton h-36 rounded-xl" />
          <div className="card p-5">
            <div className="skeleton h-5 w-40 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-lg" />)}
            </div>
          </div>
        </div>
        <div className="card p-5 skeleton h-80 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Fear & Greed Ring ─── */
function FearGreedRing({ value }: { value: number }) {
  // 3-stop semantic palette — kept in lockstep with the landing MarketPulse
  // component (src/components/landing/market-pulse.tsx) so the same index reads
  // the same color everywhere: greed=green, neutral=amber, fear=red.
  const getColor = (v: number) => {
    if (v >= 55) return "var(--color-profit)";
    if (v >= 45) return "var(--color-warning)";
    return "var(--color-loss)";
  };

  const color = getColor(value);
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (value / 100) * circumference * 0.75;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-135">
        <circle
          cx="56" cy="56" r="42"
          fill="none"
          stroke="var(--color-bg-hover)"
          strokeWidth="7"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        <circle
          cx="56" cy="56" r="42"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-mono" style={{ color }}>{value}</span>
        <span className="text-[8px] uppercase font-semibold tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
          Index
        </span>
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

  const getFearGreedColor = (value: number) => {
    if (value >= 55) return "text-[var(--color-profit)]";
    if (value >= 45) return "text-[var(--color-warning)]";
    return "text-[var(--color-loss)]";
  };

  const getFearGreedBg = (value: number) => {
    if (value >= 55) return "bg-[var(--color-profit-bg)]";
    if (value >= 45) return "bg-[var(--color-warning-bg)]";
    return "bg-[var(--color-loss-bg)]";
  };

  if (isLoading) return <PulsePageSkeleton />;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Market Pulse
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Global market metrics, funding rates, and sentiment indicators.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="btn-secondary text-xs"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh Pulse
        </button>
      </div>

      {pulseData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center: Main widgets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fear & Greed panel */}
            <div className={`card p-6 border flex items-center justify-between animate-fade-in-delay-1 ${getFearGreedBg(pulseData.fearGreed.value)}`}>
              <div>
                <span className="text-[10px] uppercase tracking-widest mb-2 font-semibold block" style={{ color: "var(--color-text-tertiary)" }}>
                  Fear & Greed Sentiment
                </span>
                <h2 className={`text-3xl font-extrabold tracking-tight ${getFearGreedColor(pulseData.fearGreed.value)}`}>
                  {pulseData.fearGreed.sentiment}
                </h2>
                <p className="text-[10px] mt-2 font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                  Last updated: {new Date(pulseData.fearGreed.timestamp).toLocaleDateString()}
                </p>
              </div>

              <FearGreedRing value={pulseData.fearGreed.value} />
            </div>

            {/* Trending assets */}
            <div className="card p-5 animate-fade-in-delay-2">
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                Top Trending Assets
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pulseData.trendingAssets.map((asset, idx) => {
                  const isUp = asset.change24h >= 0;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl flex flex-col justify-between min-h-[100px] transition-all duration-200 group"
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border-subtle)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-subtle)"; }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {asset.name}
                          </span>
                          <span className="text-[10px] font-mono block" style={{ color: "var(--color-text-tertiary)" }}>
                            {asset.symbol}/USD
                          </span>
                        </div>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isUp ? "bg-[var(--color-profit-bg)]" : "bg-[var(--color-loss-bg)]"}`}>
                          {isUp ? (
                            <ArrowUpRight size={12} className="text-[var(--color-profit)]" />
                          ) : (
                            <ArrowDownRight size={12} className="text-[var(--color-loss)]" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-sm font-bold font-mono tabular-nums">${asset.price.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold font-mono tabular-nums ${isUp ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                          {isUp ? "+" : ""}{asset.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Funding rates */}
            <div className="card p-5 animate-fade-in-delay-3">
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                Perpetual Funding Rates
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[10px] font-semibold uppercase tracking-widest"
                      style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}
                    >
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Funding Rate</th>
                      <th className="pb-3 text-right">Next Epoch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm font-medium" style={{ borderColor: "var(--color-border-subtle)" }}>
                    {pulseData.fundingRates.map((rate, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-3.5 font-mono font-bold text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "var(--color-bg-hover)" }}>
                              {rate.symbol.slice(0, 2)}
                            </div>
                            {rate.symbol}
                          </div>
                        </td>
                        <td className={`py-3.5 font-mono text-xs font-bold ${rate.rate >= 0 ? "text-[var(--color-accent-primary)]" : "text-[var(--color-loss)]"}`}>
                          <div className="flex items-center gap-1.5">
                            {rate.rate >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {rate.rate >= 0 ? "+" : ""}{(rate.rate * 100).toFixed(4)}%
                          </div>
                        </td>
                        <td className="py-3.5 text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(rate.time).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Institutional Order Flow — Coming Soon */}
          <div className="lg:col-span-1 animate-fade-in-delay-4">
            <div className="card p-5 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-hover)" }}>
                  <Activity size={14} className="text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Institutional Order Flow
                </h3>
              </div>
              <span className="badge badge-neutral text-[9px] mb-4 self-start">Roadmap</span>

              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--color-bg-tertiary), var(--color-bg-hover))",
                    border: "1px dashed var(--color-border-default)",
                  }}
                >
                  <TrendingUp size={24} className="text-[var(--color-text-quaternary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Whale & Block Trade Data</p>
                  <p className="text-[11px] mt-2 leading-relaxed text-[var(--color-text-tertiary)] max-w-[200px] mx-auto">
                    Real-time institutional order flow requires a premium data provider (e.g., Laevitas, CoinGlass).
                  </p>
                </div>
                <div className="w-full p-3 rounded-lg" style={{ border: "1px solid rgba(245, 185, 66, 0.18)", backgroundColor: "var(--color-warning-bg)" }}>
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <Clock size={11} className="text-[var(--color-warning)]" />
                    <span className="text-[10px] font-semibold text-[var(--color-warning)]">Planned Feature</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] leading-relaxed">
                    Institutional-grade on-chain analytics will be integrated in a future release.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card empty-state animate-fade-in">
          <span className="empty-state__icon">
            <Activity size={22} />
          </span>
          <p className="empty-state__title">
            Market pulse unavailable
          </p>
          <p className="empty-state__body">
            We couldn&apos;t fetch sentiment, funding, or trending data right now.
          </p>
          <button onClick={() => refetch()} className="btn-primary btn-sm empty-state__action">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
