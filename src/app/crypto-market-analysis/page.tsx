import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Crypto Market Analysis — Live BTC, ETH & SOL Chart Analysis",
  description:
    "How TradCopilot analyzes crypto markets: real-time Binance candle data for BTC, ETH and SOL, RSI/MACD/EMA/ATR/VWAP computed server-side, funding rates, Fear & Greed, and sharp-move alerts.",
  path: "/crypto-market-analysis",
  keywords: [
    "crypto market analysis",
    "ai crypto trading analysis",
    "btc chart analysis tool",
    "ethereum technical analysis",
    "crypto ai assistant",
  ],
});

const BREADCRUMBS = [{ name: "Crypto Market Analysis", path: "/crypto-market-analysis" }];

const CRYPTO_FAQS: FaqItem[] = [
  {
    question: "Which crypto instruments does TradCopilot analyze?",
    answer:
      "BTC/USD, ETH/USD, and SOL/USD today. Prices stream in real time from public Binance WebSocket feeds, and every analysis states the exact price and timestamp it used.",
  },
  {
    question: "Does TradCopilot need my exchange API keys?",
    answer:
      "No. Crypto candles come from public market-data streams that require no authentication. TradCopilot never connects to your exchange account, cannot place orders, and holds no funds.",
  },
  {
    question: "How fast are the AI analyses?",
    answer:
      "Multiple AI providers run in parallel and the first valid structured response wins, so a typical analysis returns within seconds of the indicator computation. When providers are unavailable, the terminal falls back to a clearly labeled indicator-only readout instead of inventing an interpretation.",
  },
];

export default function CryptoMarketAnalysisPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:text-left sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(CRYPTO_FAQS),
            ]}
          />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">MARKETS · CRYPTO</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              AI crypto market analysis on{" "}
              <span className="tp-serif-italic">live candles.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Crypto never closes, so your analysis shouldn&rsquo;t run on stale snapshots.
              TradCopilot computes its full technical read from real-time BTC, ETH, and SOL
              candle streams — then explains the setup in plain language, journals the
              session, and guards your risk rules around the clock.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Data pipeline ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">01 · LIVE DATA</span>
            <h2 className="tp-h2">Real-time feeds, not screenshots</h2>
            <ul className="space-y-2.5">
              {[
                "BTC/USD, ETH/USD, and SOL/USD stream from public Binance WebSocket feeds with no auth and no stored keys.",
                "Indicators are recomputed server-side per analysis: RSI(14), MACD(12,26,9), EMA alignment 9/21/50, ATR(14), 20-bar rolling VWAP, volume surge, and swing support/resistance.",
                "Selectable timeframes from 1 minute to 1 week — the same disciplined multi-timeframe workflow, one instrument set.",
                "Every output carries telemetry: the exact price and timestamp analyzed, with data points tagged confirmed, estimated, or unverified.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="tp-body text-[13px] text-[var(--muted)]">
              Because crypto trades 24/7, VWAP is computed as a rolling window rather than an
              equity-style daily reset — see our{" "}
              <Link href="/guides/technical-indicators" className="text-[var(--accent)] hover:underline">indicator guide</Link>{" "}
              for why that matters.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Structured AI output ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">02 · THE ANALYSIS</span>
            <h2 className="tp-h2">From indicators to a written setup</h2>
            <p className="tp-body">
              Deterministic code measures first; AI explains second. Multiple model providers
              race in parallel and the first internally consistent response wins — validated so
              the stop-loss side always matches the stated bias and reward-to-risk clears
              roughly 1.5 before anything reaches you. Each setup includes:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "Market regime & directional bias",
                "Setup quality grade (A+ → NO TRADE ZONE)",
                "Entry, stop-loss & take-profit ideas",
                "Invalidation level in plain language",
                "Confidence rating with rationale",
                "PNG snapshot export for your records",
              ].map((item) => (
                <div key={item} className="tc-card !py-3 !px-4 text-[13px] text-[var(--muted)]">
                  {item}
                </div>
              ))}
            </div>
            <p className="tp-body">
              The full pipeline is documented step by step in{" "}
              <Link href="/ai-chart-analysis" className="text-[var(--accent)] hover:underline">AI chart analysis</Link>.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Crypto-native context ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">03 · CRYPTO-NATIVE CONTEXT</span>
            <h2 className="tp-h2">Sentiment layers built for this market</h2>
            <ul className="space-y-2.5">
              {[
                "Fear & Greed Index alongside your charts, so regime and sentiment sit in one glance.",
                "Perpetual funding rates for BTC, ETH, and SOL — positioning context most chart tools omit.",
                "Trending assets surfaced from live market data.",
                "Proactive sharp-move notifications when crypto moves 2%+ within an hour, plus volatility-spike broadcasts as they happen.",
                "A deduplicated crypto news feed with keyword-based bullish/bearish classification and per-story impact scores.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="tp-body">
              Technical alert types — price levels, RSI thresholds, EMA crossovers, and
              trend-change checks — are covered on the{" "}
              <Link href="/trading-alerts" className="text-[var(--accent)] hover:underline">trading alerts page</Link>.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Read-only ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">04 · SAFETY</span>
            <h2 className="tp-h2">Read-only, by design</h2>
            <p className="tp-body">
              TradCopilot does not execute trades, hold funds, or connect to exchanges or
              brokers. There are no API keys to deposit permissions into, nothing to hack into
              an order ticket, and no automation to misfire at 3 a.m. You keep your exchange,
              your keys, and every decision — TradCopilot makes them better informed.
            </p>
            <p className="tp-body text-[13px] text-[var(--muted)]">
              Educational analysis only, not financial advice. Trading involves substantial
              risk of loss — read the{" "}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">full disclaimer</Link>.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── FAQ ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Crypto analysis questions</h2>
            <div>
              {CRYPTO_FAQS.map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">{faq.question}</h3>
                    <span aria-hidden className="font-mono text-[var(--accent)] text-lg leading-none shrink-0">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <p className="tp-body text-[13px] sm:text-[14px]">
              Also analyzing FX? See{" "}
              <Link href="/forex-market-analysis" className="text-[var(--accent)] hover:underline">forex market analysis</Link>.
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Analyze BTC on live data in under a minute</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              The 15-minute demo needs no signup — 2 full analyses and 1 alert. Free accounts
              add the journal, watchlists, and 5 analyses a day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/compare/tradcopilot-vs-chatgpt" className="btn-secondary btn-lg">
                Why not just ask ChatGPT? <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
