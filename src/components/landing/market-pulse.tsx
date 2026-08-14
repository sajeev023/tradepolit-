"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/reveal";

/* MarketPulse — a real-data "market at a glance" desk panel.
   All data is live and public (no auth):
     • Fear & Greed Index  — alternative.me  (via /api/v1/market/pulse)
     • Trending asset prices — Binance live   (via /api/v1/market/pulse)
   The endpoint falls back to neutral defaults on upstream outage; we surface a
   freshness timestamp so the reader can judge staleness rather than implying
   the figure is always live. No fabricated values are generated client-side. */
interface FearGreed {
  value: number;
  sentiment: string;
  timestamp: string;
}
interface TrendingAsset {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}
interface Pulse {
  fearGreed: FearGreed;
  trendingAssets: TrendingAsset[];
}

function fgColor(v: number): string {
  if (v >= 75) return "var(--green)";
  if (v >= 55) return "var(--green)";
  if (v >= 45) return "var(--amber)";
  if (v >= 25) return "var(--amber)";
  return "var(--red)";
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function FearGreedRing({ value }: { value: number }) {
  const color = fgColor(value);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (value / 100) * circumference * 0.75;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-135" role="img" aria-label={`Fear and Greed index ${value}`}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="7" strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tp-mono text-3xl font-bold tabular-nums" style={{ color }}>{value}</span>
        <span className="text-[8px] uppercase font-semibold tracking-widest text-[var(--muted)]">Index</span>
      </div>
    </div>
  );
}

export function MarketPulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/v1/market/pulse");
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        const data: Pulse | undefined = body?.data;
        if (data) {
          setPulse(data);
          setOffline(false);
          setUpdated(new Date(data.fearGreed.timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
        } else {
          setOffline(true);
        }
      } catch {
        if (active) setOffline(true);
      }
    };
    load();
    const id = setInterval(load, 45_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const fg = pulse?.fearGreed;
  const trending = pulse?.trendingAssets ?? [];

  return (
    <section id="market-pulse" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-3 mb-12 sm:mb-14">
        <span className="tp-eyebrow-mono">02 — Market pulse</span>
        <h2 className="tp-h2">
          Read the room <span className="tc-accent-phrase">before the chart.</span>
        </h2>
        <p className="tp-body max-w-md mx-auto">
          A live read on sentiment and momentum — the context that belongs next to every setup.
        </p>
      </Reveal>

      <Reveal delay={80} className="tc-terminal p-5 sm:p-6">
        <div className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
          {/* Fear & Greed */}
          <div className="flex items-center gap-5 justify-center lg:justify-start">
            <FearGreedRing value={fg?.value ?? 50} />
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                Fear &amp; Greed
              </div>
              <div className="tp-h3" style={{ color: fg ? fgColor(fg.value) : "var(--ink)" }}>
                {fg?.sentiment ?? "—"}
              </div>
              <div className="text-[11px] font-mono text-[var(--muted)]">
                {updated ? `Updated ${updated}` : offline ? "Feed offline" : "Loading…"}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px self-stretch bg-[var(--color-border-subtle)]" />

          {/* Trending assets — real live prices */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                Trending · live
              </span>
              <span className="tc-status-chip tc-status-chip--accent">
                <span className="tc-status-chip__dot tc-status-chip__dot--pulse" /> Binance
              </span>
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {trending.length === 0
                ? offline
                  ? (
                    <div className="py-3 text-[12px] font-mono text-[var(--muted)]">
                      Live data unavailable — retrying.
                    </div>
                  )
                  : [0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div className="tc-skeleton h-4 w-24 rounded" />
                      <div className="tc-skeleton h-4 w-20 rounded" />
                    </div>
                  ))
                : trending.map((a) => (
                    <div key={a.symbol} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] w-9 shrink-0">
                          {a.symbol}
                        </span>
                        <span className="text-[12px] text-[var(--muted)] truncate">{a.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="tp-mono text-[13px] font-semibold text-[var(--ink)] tabular-nums">
                          ${fmtPrice(a.price)}
                        </span>
                        <span
                          className={`tp-mono text-[12px] tabular-nums w-16 text-right ${
                            a.change24h >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                          }`}
                        >
                          {fmtPct(a.change24h)}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
        <p className="mt-5 text-[11px] text-[var(--muted)] font-mono leading-relaxed">
          Sentiment via the CNN-style Fear &amp; Greed Index; prices via Binance. Figures may be
          delayed or neutral during feed outages. Not financial advice.
        </p>
      </Reveal>
    </section>
  );
}