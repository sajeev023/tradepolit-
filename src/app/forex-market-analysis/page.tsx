import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Forex Market Analysis — EUR/USD, GBP/USD & USD/JPY Setups",
  description:
    "How TradCopilot analyzes forex: TwelveData candles for major pairs, gold and indices, session-aware analysis, lot-precise position sizing, and AI setups explained in plain language.",
  path: "/forex-market-analysis",
  keywords: [
    "forex market analysis",
    "ai forex trading analysis",
    "eurusd analysis tool",
    "forex technical analysis ai",
    "forex position sizing",
  ],
});

const BREADCRUMBS = [{ name: "Forex Market Analysis", path: "/forex-market-analysis" }];

const FOREX_FAQS: FaqItem[] = [
  {
    question: "Which forex instruments does TradCopilot analyze?",
    answer:
      "EUR/USD, GBP/USD, and USD/JPY today, plus gold (XAU/USD), NASDAQ, and S&P 500 — served through TwelveData market data. Crypto pairs (BTC, ETH, SOL) stream separately in real time from Binance.",
  },
  {
    question: "Does TradCopilot connect to my forex broker?",
    answer:
      "No. TradCopilot is strictly read-only: it never connects to a brokerage, cannot place orders, and holds no funds. You keep using your existing broker or platform alongside it.",
  },
  {
    question: "Can it calculate position size in lots?",
    answer:
      "Yes. The risk calculator outputs standard, mini, and micro lot sizes from your balance, risk percentage, entry, and stop — plus margin required and the resulting R-multiple, computed with high-precision decimal math.",
  },
];

export default function ForexMarketAnalysisPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(FOREX_FAQS),
            ]}
          />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">MARKETS · FOREX</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              AI forex market analysis, <span className="tp-serif-italic">session by session.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Forex moves on sessions, not just candles. TradCopilot computes the full
              technical read for the majors from live candle data, knows whether Asia,
              London, or New York is in play, sizes your positions to the lot — and explains
              every setup in language you can act on or discard.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Data ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">01 · COVERAGE</span>
            <h2 className="tp-h2">Majors, gold, and indices on one workspace</h2>
            <ul className="space-y-2.5">
              {[
                "Instruments: EUR/USD, GBP/USD, USD/JPY, plus gold (XAU/USD), NASDAQ, and S&P 500 via TwelveData.",
                "Indicators computed per timeframe: RSI(14), MACD(12,26,9), EMA alignment 9/21/50, ATR(14), 20-bar rolling VWAP, volume surge, and swing support/resistance.",
                "Session detection for Asia, London, and New York, so analyses carry the context of who is actually trading.",
                "Selectable analysis timeframes from 1 minute to 1 week.",
                "Telemetry with every output: exact price and timestamp analyzed, data points tagged confirmed, estimated, or unverified.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="tp-body text-[13px] text-[var(--muted)]">
              Optionally supply your own TwelveData API key for higher rate limits — encrypted
              at rest with AES-256-GCM.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Analysis ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">02 · THE ANALYSIS</span>
            <h2 className="tp-h2">Structured setups, not vague commentary</h2>
            <p className="tp-body">
              The pipeline is the same one that powers{" "}
              <Link href="/ai-chart-analysis" className="text-[var(--accent)] hover:underline">AI chart analysis</Link>:
              deterministic code measures the market first; multiple AI providers race to
              explain it; an internal consistency gate rejects any setup whose stop-loss side
              contradicts its bias or whose reward-to-risk doesn&rsquo;t clear roughly 1.5.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "Bias & regime read for the pair",
                "Setup quality grade (A+ → NO TRADE ZONE)",
                "Entry, stop-loss & target ideas",
                "Invalidation level in plain language",
                "ATR-sized stops matched to FX volatility",
                "PNG snapshot export of any analysis",
              ].map((item) => (
                <div key={item} className="tc-card !py-3 !px-4 text-[13px] text-[var(--muted)]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Lot math ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">03 · RISK MATH</span>
            <h2 className="tp-h2">Lot-precise position sizing</h2>
            <p className="tp-body">
              Forex risk lives or dies on lot arithmetic. Enter account balance, risk %,
              entry, stop, and optional target; the calculator returns standard, mini, and
              micro lot outputs with margin required and the resulting R-multiple. The full
              formulas are explained in our{" "}
              <Link href="/guides/position-sizing-guide" className="text-[var(--accent)] hover:underline">
                position sizing guide
              </Link>
              .
            </p>
            <p className="tp-body">
              Around the trade itself, the{" "}
              <Link href="/trading-journal" className="text-[var(--accent)] hover:underline">session journal</Link>{" "}
              logs each FX trade with emotion and mistake tags, and{" "}
              <Link href="/risk-management" className="text-[var(--accent)] hover:underline">behavioral guardrails</Link>{" "}
              warn against revenge-style re-entries and overtrading days before capital goes
              out.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Read-only ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">04 · SAFETY</span>
            <h2 className="tp-h2">No broker connections. Ever.</h2>
            <p className="tp-body">
              TradCopilot cannot execute trades, hold funds, or touch your brokerage account.
              It is an analytical workstation — educational information only, not investment
              advice, and not a registered investment advisor or broker-dealer. Trading
              involves substantial risk of loss; see the{" "}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">full disclaimer</Link>.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── FAQ ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Forex analysis questions</h2>
            <div>
              {FOREX_FAQS.map((faq) => (
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
              Also trading crypto? See{" "}
              <Link href="/crypto-market-analysis" className="text-[var(--accent)] hover:underline">crypto market analysis</Link>.
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Run one analysis on EUR/USD right now</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              The 15-minute demo needs no signup — 2 full analyses and 1 alert. Free accounts
              add the journal, watchlists, and 5 analyses a day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/pricing" className="btn-secondary btn-lg">
                See Pricing <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
