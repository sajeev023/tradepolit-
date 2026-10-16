import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trading Guides — Position Sizing, Discipline, Support & Resistance",
  description:
    "Practical, math-first trading guides for crypto and forex day traders: position sizing formulas, trading discipline systems, support and resistance mapping, technical indicators, and multi-timeframe analysis.",
  path: "/guides",
  keywords: [
    "trading guides",
    "crypto and forex education",
    "position sizing",
    "trading discipline",
    "technical analysis guides",
  ],
});

const BREADCRUMBS = [{ name: "Guides", path: "/guides" }];

const GUIDES = [
  {
    href: "/guides/position-sizing-guide",
    name: "The Complete Guide to Position Sizing",
    summary:
      "Fixed-fractional risk math, stop-distance arithmetic, leverage exposure, and forex standard/mini/micro lot conversion — with worked examples for both BTC/USD and EUR/USD.",
    tag: "RISK MANAGEMENT",
  },
  {
    href: "/guides/trading-discipline",
    name: "A Practical System for Trading Discipline",
    summary:
      "Why discipline fails under drawdown, how to build a written rule set you can actually follow, and how journaling plus pre-trade guardrails turn intentions into habits.",
    tag: "PSYCHOLOGY",
  },
  {
    href: "/guides/support-and-resistance",
    name: "Support & Resistance That Holds Up",
    summary:
      "How to map levels objectively from swing highs and lows instead of eyeballing them — the same swing-based method TradCopilot computes automatically on live candles.",
    tag: "MARKET STRUCTURE",
  },
  {
    href: "/guides/technical-indicators",
    name: "RSI, MACD, EMA, ATR & VWAP Explained",
    summary:
      "What each indicator measures, how it is calculated, where it misleads, and how they fit together in one structured read of a chart — using the exact parameters TradCopilot computes.",
    tag: "INDICATORS",
  },
  {
    href: "/guides/multi-timeframe-analysis",
    name: "Multi-Timeframe Analysis, Step by Step",
    summary:
      "How to align a higher-timeframe bias with lower-timeframe entries, which timeframe pairs work for day trading, and the mistakes that make MTF analysis contradict itself.",
    tag: "WORKFLOW",
  },
];

export default function GuidesHubPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS)]} />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <BookOpen size={16} />
              <span className="tp-eyebrow-mono">KNOWLEDGE BASE</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Trading guides that respect <span className="tp-serif-italic">the math.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Short, practical, and grounded in the same calculations TradCopilot runs on
              live candles. Educational content only — not financial advice.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Guide Cards ── */}
          <section className="space-y-4">
            {GUIDES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="tc-card group block space-y-2.5 hover:border-[var(--accent)] transition-colors"
              >
                <span className="tp-eyebrow-mono text-[10px]">{g.tag}</span>
                <span className="tc-arrow-link font-medium text-sm block">
                  {g.name} <ArrowRight size={14} />
                </span>
                <p className="text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
                  {g.summary}
                </p>
              </Link>
            ))}
          </section>

          <hr className="tc-rule" />

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Practice every concept on live charts</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              TradCopilot computes these same indicators from real-time crypto and forex
              data — then journals the session and guards your risk rules. Free plan included.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/features" className="btn-secondary btn-lg">
                See How It Works
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
