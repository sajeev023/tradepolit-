import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMetadata,
  breadcrumbJsonLd,
  faqPageJsonLd,
  ENTITY_DEFINITION,
} from "@/lib/seo";
import { FAQS } from "@/lib/faq-data";

export const metadata: Metadata = buildMetadata({
  title: "Features — AI Chart Analysis, Journal, Risk & Discipline Tools",
  description:
    "Every TradCopilot feature in one place: AI chart analysis from live candles, session journaling, behavioral guardrails, position sizing, backtesting, and alerts.",
  path: "/features",
  keywords: [
    "ai trading copilot features",
    "ai trading tools",
    "crypto analysis tools",
    "forex analysis tools",
  ],
});

/** The three most feature-relevant entries from the shared FAQ source of truth. */
const FEATURE_FAQS = FAQS.filter((faq) =>
  [
    "How does TradCopilot analyze market data?",
    "How does the behavioral discipline engine work?",
    "Which markets and instruments are supported?",
  ].includes(faq.question),
);

function FeatureSection({
  index,
  eyebrow,
  title,
  lead,
  bullets,
  href,
  linkLabel,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lead: string;
  bullets: string[];
  href?: string;
  linkLabel?: string;
}) {
  return (
    <section className="space-y-3">
      <span className="tp-eyebrow-mono">
        {index} · {eyebrow}
      </span>
      <h2 className="tp-h2">{title}</h2>
      <p className="tp-body">{lead}</p>
      <ul className="space-y-2">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]"
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {href && linkLabel ? (
        <Link href={href} className="tc-arrow-link">
          {linkLabel}
          <ArrowRight size={14} />
        </Link>
      ) : null}
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-10 sm:space-y-14">
          <JsonLd
            data={[
              breadcrumbJsonLd([{ name: "Features", path: "/features" }]),
              faqPageJsonLd(FEATURE_FAQS),
            ]}
          />

          {/* ── Masthead ── */}
          <header className="space-y-3">
            <Breadcrumbs items={[{ name: "Features", path: "/features" }]} />
            <span className="tp-eyebrow-mono block pt-2">PRODUCT FEATURES</span>
            <h1 className="tp-h1 tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Every tool in the TradCopilot workspace
            </h1>
            <p className="tp-body max-w-2xl">{ENTITY_DEFINITION}</p>
            <p className="tp-body max-w-2xl text-[13px] sm:text-[14px]">
              This page is the complete inventory of what that means in practice. Every
              capability below ships today, covering nine instruments —{" "}
              <Link href="/crypto-market-analysis" className="text-[var(--accent)] hover:underline">BTC/USD, ETH/USD, and SOL/USD</Link>,{" "}
              <Link href="/forex-market-analysis" className="text-[var(--accent)] hover:underline">EUR/USD, GBP/USD, and USD/JPY</Link>,
              gold (XAU/USD), NASDAQ, and S&P 500 — with
              selectable analysis timeframes from 1 minute to 1 week. Each section links to a
              deeper page on that capability.
            </p>
          </header>

          <hr className="tc-rule" />

          <FeatureSection
            index="01"
            eyebrow="ANALYSIS ENGINE"
            title="AI chart analysis computed from live candles"
            lead="Deterministic code reads the market first. Indicators are computed server-side from live OHLCV candles — real-time Binance WebSocket streams for crypto, TwelveData for forex, gold, and indices — and only then does the AI layer turn those readings into a written setup."
            bullets={[
              "Indicators: RSI(14), MACD(12,26,9) with histogram, EMA 9/21/50 alignment, SMA, ATR(14), 20-bar rolling VWAP, volume-surge ratio, swing support/resistance, and Asia/London/New York session detection.",
              "Structured output: market regime, bias, setup quality (A+, HIGH GRADE, SPECULATIVE, NO TRADE ZONE), confidence (HIGH/MEDIUM/LOW), entry, stop-loss and take-profit ideas, an invalidation level, and a plain-language rationale.",
              "Multi-model race: Groq (Llama 3.3 70B and Llama 3.1 8B), Google Gemini 2.0 Flash, NVIDIA-hosted Llama 3.1, and OpenAI GPT-4o-mini fire in parallel; the first valid response wins.",
              "Consistency validation before display: the stop side must match the bias and the reward-to-risk must clear roughly 1.5, or the setup is rejected.",
              "Telemetry transparency: a block shows the exact price and timestamp analyzed, data points are tagged confirmed, estimated, or unverified, and an indicator-only fallback is clearly labeled when AI providers are unavailable.",
            ]}
            href="/ai-chart-analysis"
            linkLabel="How the analysis engine works, step by step"
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="02"
            eyebrow="MEMORY"
            title="An automated session journal"
            lead="Every trade you log becomes structured memory — full records with direction, size, leverage, stop, target, R-multiple, and P&L, plus the context numbers alone lose."
            bullets={[
              "Emotion tags: Confident, Fearful, Greedy, Revenge, FOMO, Disciplined, Neutral.",
              "Mistake tags: FOMO Entry, Overleveraging, Moving Stop Loss, Early Exit, Revenge Trade, No Plan, Poor Sizing.",
              "Lessons learned and screenshots attached to each entry.",
              "Your last 20 trades feed the AI's context, so analyses reference your actual history instead of a generic template.",
            ]}
            href="/trading-journal"
            linkLabel="Inside the journal: capture, tags, and memory"
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="03"
            eyebrow="DISCIPLINE"
            title="Behavioral guardrails that warn, never block"
            lead="The terminal compares what you are doing right now against your last 20 trades and your declared risk rules, then tells you — before you deploy capital."
            bullets={[
              "Revenge-style re-entry flag: a new trade opened less than 30 minutes after a losing trade closed.",
              "Overtrading flag: more than five trades in a single day.",
              "Cutting-winners-early flag: your average win is smaller than 0.6× your average loss.",
              "A weekly discipline summary of the patterns it saw.",
              "It warns — it never blocks, locks, or cools anything down. TradCopilot is read-only; the decision stays yours.",
            ]}
            href="/risk-management"
            linkLabel="How the behavioral engine and risk warnings work"
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="04"
            eyebrow="RISK MATH"
            title="Position size and risk calculator"
            lead="Size the position before you place it: enter your account balance, the percentage you are willing to risk, your entry, and your stop. The sizing is leverage-aware and returns the exact number to trade — no mental arithmetic at the moment of entry."
            bullets={[
              "Position size computed from balance, risk %, entry, and stop, with an optional take-profit target.",
              "Forex standard, mini, and micro lot outputs, plus margin required and the resulting R-multiple.",
              "Warnings when the inputs don't add up, computed with high-precision decimal math.",
            ]}
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="05"
            eyebrow="TESTING"
            title="Rule-based strategy backtesting"
            lead="Test a simple crossover thesis against recent history before you risk anything on it."
            bullets={[
              "Rules built from EMA20, EMA50, and price crossovers; long-only; run over the most recent 500 candles.",
              "Outputs: win rate, profit factor, max drawdown, and an equity curve.",
              "Assumptions are disclosed up front — no fees or slippage are modeled, so treat results as directional evidence, not a promise of future performance.",
            ]}
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="06"
            eyebrow="MONITORING"
            title="Alerts with an honest cadence"
            lead="Set alerts on price levels, RSI thresholds, EMA crossovers, and trend change versus the 50 EMA. They are evaluated on a daily scheduled check and fire in-app notifications — daily monitoring, deliberately not second-by-second surveillance."
            bullets={[
              "Four alert types: PRICE, RSI, EMA-cross, and trend-change.",
              "Daily scheduled evaluation with an in-app notification when an alert triggers.",
              "Separately, the system proactively broadcasts sharp-move (2%+ hourly crypto moves) and volatility-spike notifications as they happen.",
            ]}
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="07"
            eyebrow="CONTEXT"
            title="Market pulse and a deduplicated news feed"
            lead="A sentiment layer around the charts: where positioning and headlines lean, in one glance."
            bullets={[
              "Fear & Greed Index, BTC/ETH/SOL perpetual funding rates, and trending assets.",
              "News merged from Finnhub and NewsAPI and deduplicated, with keyword-based bullish/bearish/neutral classification and an impact score per story.",
            ]}
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="08"
            eyebrow="PRO ANALYTICS"
            title="Weekly AI report and analytics dashboard (Pro)"
            lead="Pro turns the journal into a performance review loop instead of a record you never reread. Both run on the trade history you already log — no separate data entry."
            bullets={[
              "Weekly AI report: a five-section review of your trading performance, generated from your logged history.",
              "Performance analytics dashboard over your full record, with behavioral events logged so patterns stay visible over time — not just flagged once.",
            ]}
          />

          <hr className="tc-rule" />

          <FeatureSection
            index="09"
            eyebrow="ARCHITECTURE"
            title="Under the hood: read-only by design"
            lead="The constraints that make the rest of it trustworthy:"
            bullets={[
              "No trade execution, no broker or exchange connections, no custody of funds — TradCopilot cannot place an order.",
              "The only optional keys are market-data API keys you supply yourself, encrypted at rest with AES-256-GCM.",
              "Supabase authentication (email and Google), Stripe billing, and self-serve account and data deletion from Settings.",
              "Charts are the embedded TradingView widget, and any analysis can be exported as a PNG snapshot.",
            ]}
          />

          <hr className="tc-rule" />

          {/* ── Plans ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">PLANS</span>
            <h2 className="tp-h2">Free vs Pro at a glance</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="tc-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="tc-card__title">Free</span>
                  <span className="tc-badge">$0 forever</span>
                </div>
                <ul className="space-y-2">
                  {[
                    "5 AI chart analyses per day",
                    "3 alerts per day",
                    "Trade journal, watchlists, and saved analyses",
                    "15-minute no-signup demo first (2 analyses, 1 alert)",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--muted)]"
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="tc-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="tc-card__title">Pro</span>
                  <span className="tc-badge tc-badge--accent">$7.49/month</span>
                </div>
                <ul className="space-y-2">
                  {[
                    "Unlimited AI analyses and alerts",
                    "Performance analytics dashboard",
                    "Weekly AI report (five sections)",
                    "Behavioral event logging",
                    "7-day Pro trial — cancel anytime",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--muted)]"
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="tp-body text-[13px] sm:text-[14px]">
              Full plan comparison — limits, trial, and billing — is on the{" "}
              <Link
                href="/pricing"
                className="text-[var(--accent)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--accent-bright)]"
              >
                pricing page
              </Link>
              .
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── FAQ ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Feature questions, answered</h2>
            <div>
              {FEATURE_FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group border-b border-[var(--color-border-subtle)] py-3.5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--ink)] tracking-[-0.01em]">
                      {faq.question}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-[var(--accent)] text-lg leading-none shrink-0"
                    >
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="tp-body mt-2.5 text-[13px] sm:text-[14px]">{faq.answer}</p>
                </details>
              ))}
            </div>
            <p className="tp-body text-[13px] sm:text-[14px]">
              Markets, pricing, privacy, and data handling are covered in the{" "}
              <Link
                href="/faq"
                className="text-[var(--accent)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--accent-bright)]"
              >
                full FAQ
              </Link>
              . New to the math behind it all? The{" "}
              <Link
                href="/guides"
                className="text-[var(--accent)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--accent-bright)]"
              >
                trading guides
              </Link>{" "}
              explain every indicator this terminal computes.
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <span className="tp-eyebrow-mono block">START READ-ONLY</span>
            <h2 className="tp-h2">Run one full analysis on your own chart</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              The 15-minute demo needs no signup — 2 analyses and 1 alert, end to end. A free
              account adds the journal, watchlists, and 5 analyses a day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start free — 5 analyses a day, no card required
              </Link>
              <Link href="/pricing" className="btn-secondary btn-lg">
                Compare plans
              </Link>
            </div>
            <p className="text-xs text-[var(--muted)] pt-1">
              TradCopilot provides educational market analysis, not financial advice — read the{" "}
              <Link
                href="/disclaimer"
                className="underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--ink)]"
              >
                full disclaimer
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
