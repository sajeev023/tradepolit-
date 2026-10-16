import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Zap, Sliders, Activity, ShieldCheck } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trading Alerts — Price Levels, RSI Extremes & Trend Crossover Triggers",
  description:
    "Set technical alerts on crypto and forex pairs: price thresholds, RSI overbought/oversold levels, EMA crossovers, and volatility spike notifications.",
  path: "/trading-alerts",
  keywords: [
    "trading alerts",
    "crypto price alerts",
    "forex technical alerts",
    "rsi alert bot",
    "ema crossover alerts",
    "market volatility notifications",
  ],
});

const BREADCRUMBS = [
  { name: "Features", path: "/features" },
  { name: "Trading Alerts", path: "/trading-alerts" },
];

const ALERT_FAQS: FaqItem[] = [
  {
    question: "What types of technical alerts can I configure?",
    answer:
      "You can configure four core alert types: 1) PRICE (crossing above or below a specific level), 2) RSI (crossing into overbought above 70 or oversold below 30), 3) EMA Cross (e.g. 9 EMA crossing above or below 21 EMA), and 4) Trend Change (price closing across the 50 EMA baseline).",
  },
  {
    question: "How frequently are alerts evaluated?",
    answer:
      "User-defined indicator alerts are evaluated on a scheduled daily cadence. Separately, the live market telemetry system broadcasts real-time notifications for sharp moves (2%+ hourly swings on major crypto pairs) and extreme volatility spikes.",
  },
  {
    question: "How many alerts are included in the Free vs Pro plans?",
    answer:
      "The Free Plan includes up to 3 active concurrent alerts per day. The Pro Plan includes unlimited alerts with priority notification delivery.",
  },
];

const ALERT_TYPES = [
  {
    icon: Bell,
    title: "Price Level Breakouts & Retests",
    tag: "PRICE",
    description:
      "Alerts when price crosses key structural swing highs, swing lows, or psychological round-number barriers.",
  },
  {
    icon: Activity,
    title: "RSI Momentum Extremes",
    tag: "RSI",
    description:
      "Triggers when RSI(14) crosses into overbought territory (>70) or oversold exhaustion (<30) on your chosen timeframe.",
  },
  {
    icon: Sliders,
    title: "Moving Average Crossovers",
    tag: "EMA_CROSS",
    description:
      "Notifies you when fast trend lines cross slow trend lines (e.g., 9 EMA crossing 21 EMA) signaling momentum shifts.",
  },
  {
    icon: Zap,
    title: "Trend Inversion & 50 EMA",
    tag: "TREND_CHANGE",
    description:
      "Alerts when price closes across the 50 EMA baseline, confirming or invalidating the intermediate directional bias.",
  },
];

export default function TradingAlertsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(ALERT_FAQS),
            ]}
          />

          {/* ── Masthead ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">TECHNICAL MONITORING</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Trading alerts with <span className="tp-serif-italic">honest cadences.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Never miss key structural price breaks or momentum exhaustion. Set clear technical triggers on BTC, ETH, SOL, EUR/USD, and gold without cluttering your screen with noise.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/signup" className="btn-primary btn-lg">
                Set Free Alerts
              </Link>
              <Link href="/features" className="btn-secondary btn-lg">
                View All Features
              </Link>
            </div>
          </header>

          <hr className="tc-rule" />

          {/* ── Alert Types Grid ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">01 · TRIGGER CATEGORIES</span>
            <h2 className="tp-h2">Four deterministic alert conditions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {ALERT_TYPES.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div key={alert.title} className="tc-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] text-[var(--accent)]">
                        <Icon size={16} />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--muted)] border border-[var(--color-border-subtle)]">
                        {alert.tag}
                      </span>
                    </div>
                    <h3 className="tp-h3 !text-[15px] font-semibold">{alert.title}</h3>
                    <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Architecture & Transparency ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">02 · EVALUATION INTEGRITY</span>
            <h2 className="tp-h2">How alert triggers are calculated</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Alert triggers are evaluated against server-side candlestick feeds (Binance WebSocket for crypto, TwelveData for forex, gold, and indices). Because TradCopilot uses deterministic calculation engines, alerts fire strictly when mathematical conditions are met — never from speculative predictive guessing.
              </p>
              <div className="tc-terminal p-4 sm:p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--accent)] font-mono font-semibold">
                  <ShieldCheck size={14} /> NO BROKERAGE CONNECTION REQUIRED
                </div>
                <p className="text-[var(--muted)] leading-relaxed">
                  TradCopilot alerts are purely informational notifications. The system does not custody funds, place orders, or connect to your execution broker. You remain 100% in control of order placement on your preferred exchange.
                </p>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Market alerts FAQ</h2>
            <div className="space-y-3">
              {ALERT_FAQS.map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                    <h3 className="text-[14px] sm:text-[15px] font-semibold text-[var(--ink)]">
                      {faq.question}
                    </h3>
                    <span className="text-[var(--accent)] font-mono text-sm group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-[13px] text-[var(--muted)] leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <span className="tp-eyebrow-mono block">GET REAL-TIME TELEMETRY</span>
            <h2 className="tp-h2">Monitor key levels with zero noise</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Set up to 3 alerts on the Free Plan or upgrade to Pro for unlimited indicator tracking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free
              </Link>
              <Link href="/pricing" className="btn-secondary btn-lg">
                View Pro Plans
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
