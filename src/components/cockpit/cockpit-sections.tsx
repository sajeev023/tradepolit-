"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CandlestickChart, Plus, Sparkles, Target } from "lucide-react";
import { useBinanceMultiStream } from "@/hooks/useBinanceStream";
import { useUIStore } from "@/lib/stores/ui-store";
import { formatPrice } from "@/lib/format-price";
import { Chip, Delta, EmptyState, Label, Panel, Skeleton } from "@/components/fd/primitives";

export interface Thesis {
  id: string;
  symbol: string;
  timeframe: string;
  bias: "LONG" | "SHORT";
  status: "OPEN" | "HIT" | "INVALIDATED" | "EXPIRED";
  riskReward: string | number;
  createdAt: string;
  outcome: unknown | null;
}

export interface InsightItem {
  headline: string;
  metrics: { sampleSize: number };
}
export interface Insights {
  winRateBySetup: InsightItem[];
  mistakePatterns: InsightItem[];
  riskBehavior: InsightItem[];
  summary: { closedTrades: number; thesisOutcomes: number };
}

const MARKETS = ["BTC/USD", "ETH/USD", "SOL/USD"];

function greeting(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ageLabel(iso: string) {
  const hrs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  return hrs < 1 ? "<1h" : hrs < 48 ? `${Math.floor(hrs)}h` : `${Math.floor(hrs / 24)}d`;
}

/* ───────────────────────── Hero ───────────────────────── */

export function CockpitHero({ openCount, reviewCount, closedTrades }: { openCount: number; reviewCount: number; closedTrades: number | null }) {
  const [now, setNow] = useState<Date | null>(null);
  const askCopilot = useUIStore((s) => s.askCopilot);
  const prices = useBinanceMultiStream(MARKETS);
  useEffect(() => setNow(new Date()), []);

  const btc = prices["BTC/USD"];
  const bits: string[] = [];
  if (btc) bits.push(`BTC is ${btc.changePercent24h >= 0 ? "up" : "down"} ${Math.abs(btc.changePercent24h).toFixed(2)}% today`);
  bits.push(openCount === 0 ? "no open theses" : `${openCount} open ${openCount === 1 ? "thesis" : "theses"}`);
  if (reviewCount > 0) bits.push(`${reviewCount} awaiting review`);

  return (
    <section className="relative overflow-hidden rounded-[14px] border" style={{ background: "var(--panel-1)", borderColor: "var(--hairline)" }}>
      {/* horizon line */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.7) 30%, rgba(var(--accent-rgb),0.7) 70%, transparent)" }} />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl" style={{ background: "var(--accent)" }} />

      <div className="relative grid gap-7 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:p-10">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <Label>
              {now ? now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "—"} ·{" "}
              {now ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "--:--"} local
            </Label>
            <h2 className="mt-3 font-serif text-[clamp(2.2rem,1.5rem+3.4vw,4.4rem)] leading-[0.98] tracking-[-0.02em] text-[var(--color-text-primary)]">
              {now ? greeting(now.getHours()) : "Welcome"}
              <span style={{ color: "var(--accent)" }}>.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              {bits.join(" · ")}.{" "}
              {closedTrades === 0 || closedTrades === null
                ? "Log a few trades and I'll start learning how you trade."
                : `I've learned from ${closedTrades} closed ${closedTrades === 1 ? "trade" : "trades"} so far.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Link href="/charts" className="btn-primary btn-lg col-span-2 sm:col-span-1">
              <CandlestickChart size={16} /> Analyze a chart
            </Link>
            <Link href="/journal" className="btn-secondary btn-lg">
              <Plus size={15} /> Log a trade
            </Link>
            <button onClick={() => askCopilot("Summarize how my trading has been going.")} className="btn-ghost btn-lg">
              <Sparkles size={15} style={{ color: "var(--accent)" }} /> Ask Copilot
            </button>
          </div>
        </div>

        {/* Market horizon — live prices, no invented series */}
        <div className="flex flex-col justify-end">
          <div className="mb-3 flex items-center justify-between">
            <Label>Market horizon</Label>
            <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">
              <span className="live-dot" style={{ width: 5, height: 5 }} /> Live
            </span>
          </div>
          <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
            {MARKETS.map((sym) => {
              const t = prices[sym];
              return (
                <li key={sym} className="flex items-baseline justify-between gap-3 py-3 sm:gap-4 sm:py-3.5" style={{ borderColor: "var(--hairline)" }}>
                  <span className="font-mono text-[12px] tracking-[0.06em] text-[var(--color-text-tertiary)]">{sym.split("/")[0]}</span>
                  {t ? (
                    <span className="flex items-baseline gap-3 sm:gap-4">
                      <motion.span
                        key={Math.round(t.price)}
                        initial={{ opacity: 0.4, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-[22px] font-medium tabular-nums tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[26px]"
                      >
                        {formatPrice(sym, t.price)}
                      </motion.span>
                      <Delta value={t.changePercent24h} className="w-[68px] text-right text-[12px] sm:w-[76px]" />
                    </span>
                  ) : (
                    <Skeleton className="h-7 w-40" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Theses on watch ───────────────────────── */

export function ThesesOnWatch({ theses, loading }: { theses: Thesis[] | undefined; loading: boolean }) {
  const open = theses?.filter((t) => t.status === "OPEN") ?? [];
  const review = theses?.filter((t) => t.status !== "OPEN" && !t.outcome) ?? [];
  const rows = [...review.map((t) => ({ t, kind: "review" as const })), ...open.map((t) => ({ t, kind: "open" as const }))].slice(0, 6);

  return (
    <Panel label="On watch" title="Your theses" action={{ href: "/theses", text: "All theses" }} className="h-full">
      {loading ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Target size={18} />}
          title="Nothing being watched yet"
          body="Run an analysis on the chart, tap Save as Thesis, and I'll monitor it against price until it hits or invalidates."
          action={<Link href="/charts" className="btn-secondary btn-sm">Open Markets <ArrowRight size={13} /></Link>}
        />
      ) : (
        <ul className="-mx-2 space-y-1">
          {rows.map(({ t, kind }, i) => (
            <motion.li key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
              <Link href="/theses" className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-[var(--color-bg-hover)]">
                <span className="h-9 w-[3px] rounded-full" style={{ background: kind === "review" ? "var(--color-warning)" : t.bias === "LONG" ? "var(--color-profit)" : "var(--color-loss)" }} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2.5">
                    <span className="font-mono text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{t.symbol}</span>
                    <Chip tone={t.bias === "LONG" ? "gain" : "loss"}>{t.bias}</Chip>
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--color-text-quaternary)]">
                    {t.timeframe} · R:R {t.riskReward} · opened {ageLabel(t.createdAt)} ago
                  </p>
                </div>
                {kind === "review" ? <Chip tone="warn" dot>Review</Chip> : <Chip tone="signal" dot>Monitoring</Chip>}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── What Copilot noticed ───────────────────────── */

export function CopilotNoticed({ insights, loading }: { insights: Insights | null | undefined; loading: boolean }) {
  const askCopilot = useUIStore((s) => s.askCopilot);
  const items = [
    ...(insights?.winRateBySetup ?? []).map((i) => ({ ...i, kind: "Setup" })),
    ...(insights?.mistakePatterns ?? []).map((i) => ({ ...i, kind: "Mistake" })),
    ...(insights?.riskBehavior ?? []).map((i) => ({ ...i, kind: "Risk" })),
  ].slice(0, 3);

  return (
    <Panel label="Copilot noticed" title="Patterns in your trading" action={{ href: "/patterns", text: "All patterns" }} className="h-full">
      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={18} />}
          title="Still learning your style"
          body="Patterns are computed from your own closed trades and thesis outcomes. Log a few and they'll appear here."
          action={<button onClick={() => askCopilot("What should I log in my journal to get useful patterns?")} className="btn-secondary btn-sm">Ask Copilot how <ArrowRight size={13} /></button>}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <motion.li
              key={it.headline}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="border-l-2 pl-3.5"
              style={{ borderColor: it.kind === "Mistake" ? "var(--color-warning)" : "var(--accent)" }}
            >
              <p className="flex items-center gap-2">
                <Label>{it.kind}</Label>
                <Label className="!text-[var(--color-text-quaternary)]/70">n={it.metrics.sampleSize}</Label>
              </p>
              <p className="mt-1 text-[13.5px] leading-snug text-[var(--color-text-primary)]">{it.headline}</p>
              <button
                onClick={() => askCopilot(`Explain this pattern in my trading and how to act on it: ${it.headline}`)}
                className="mt-1.5 flex cursor-pointer items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] transition-opacity hover:opacity-70"
              >
                <Sparkles size={11} /> Ask why
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ───────────────────────── Market mood ───────────────────────── */

export function MarketMood() {
  const { data } = useQuery<{ fearGreed: { value: number; sentiment: string } } | null>({
    queryKey: ["market-pulse-mood"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/pulse");
      const body = await res.json();
      return res.ok ? body.data : null;
    },
    staleTime: 5 * 60_000,
  });
  const v = data?.fearGreed?.value;
  if (typeof v !== "number") return null;
  const tone = v >= 60 ? "var(--color-profit)" : v <= 40 ? "var(--color-loss)" : "var(--color-warning)";
  return (
    <Panel label="Crypto mood" title="Fear & Greed" action={{ href: "/news", text: "Market news" }}>
      <div className="flex items-end justify-between">
        <span className="font-mono text-[44px] font-medium leading-none tabular-nums tracking-[-0.04em]" style={{ color: tone }}>{v}</span>
        <span className="pb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">{data?.fearGreed.sentiment}</span>
      </div>
      <div className="relative mt-4 h-1.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--color-loss), var(--color-warning) 50%, var(--color-profit))" }}>
        <motion.span
          initial={{ left: "50%" }}
          animate={{ left: `${v}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-text-primary)]"
          style={{ boxShadow: "0 0 0 3px var(--panel-1)" }}
        />
      </div>
    </Panel>
  );
}
