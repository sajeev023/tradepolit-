import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers, Target, ShieldCheck, Crosshair } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Support and Resistance Guide — Swing Highs, Liquidity Sweeps & Invalidation Levels",
  description:
    "Learn how professional traders identify structural support and resistance levels, spot fake breakouts, and establish precise invalidation points on crypto and forex charts.",
  path: "/guides/support-and-resistance",
  ogType: "article",
  publishedTime: "2026-08-22T00:00:00.000Z",
  keywords: [
    "support and resistance guide",
    "how to draw support and resistance",
    "liquidity sweeps trading",
    "fake breakout vs real breakout",
    "trading invalidation levels",
    "technical analysis chart structure",
  ],
});

const BREADCRUMBS = [
  { name: "Guides", path: "/guides" },
  { name: "Support and Resistance", path: "/guides/support-and-resistance" },
];

export default function SupportAndResistanceGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: "The Technical Guide to Structural Support, Resistance & Invalidation",
                description:
                  "How to identify high-probability price zones, differentiate between wick sweeps and candle closes, and establish mathematical invalidation levels.",
                path: "/guides/support-and-resistance",
                datePublished: "2026-08-22T00:00:00.000Z",
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">TECHNICAL ANALYSIS GUIDE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Support, Resistance &amp; <span className="tp-serif-italic">The Art of Invalidation.</span>
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              Support and resistance are not razor-thin lines on a chart — they are dynamic zones where institutional supply and demand interact. Learn how to identify structural zones and use them to define objective risk.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Section 1: Zones vs Lines ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">01 · CORE CONCEPT</span>
            <h2 className="tp-h2">Price zones vs razor-thin lines</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Beginner traders often treat support or resistance as an exact price point (e.g. &ldquo;Bitcoin will bounce at exactly $60,000.00&rdquo;). When price dips to $59,850 before reversing sharply upward, they are stopped out by normal market liquidity probing.
              </p>
              <p className="tp-body">
                Institutional order flow accumulates in <strong className="text-[var(--ink)]">zones</strong> defined between swing candle bodies (where the majority of volume transactions closed) and extreme candle wicks (where liquidity was swept).
              </p>
            </div>
          </section>

          {/* ── Section 2: Wicks vs Closes ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">02 · PRICE ACTION MECHANICS</span>
            <h2 className="tp-h2">Candle wick rejections vs confirmed closes</h2>
            <div className="space-y-4 max-w-[65ch]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="tc-card space-y-2">
                  <span className="tp-eyebrow-mono text-[var(--accent)]">LIQUIDITY SWEEP (WICK)</span>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">Wick Piercing</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Price pierces beyond a swing high/low during intra-bar volatility, triggers resting stop orders, and closes back inside the previous range. This signals absorption and potential mean reversion.
                  </p>
                </div>

                <div className="tc-card space-y-2">
                  <span className="tp-eyebrow-mono text-[var(--accent)]">STRUCTURAL BREAK (CLOSE)</span>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">Full Candle Body Close</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    A candle body closes decisively above resistance or below support accompanied by above-average volume, confirming that buyers or sellers have established control in the new price territory.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Invalidation Level ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">03 · THE THESIS ANCHOR</span>
            <h2 className="tp-h2">The importance of an invalidation level</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Before entering any trade, you must answer one question: <em className="text-[var(--ink)]">At what exact price point is this trade thesis objectively proven wrong?</em>
              </p>
              <p className="tp-body">
                If you are buying a support retest, your invalidation point is not where you run out of money — it is just below the structural swing low that supports the idea. If that level breaks, the thesis is void and you exit immediately with a controlled 1R loss.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-8 text-center space-y-4">
            <span className="tp-eyebrow-mono block">AUTOMATED LEVEL DETECTION</span>
            <h2 className="tp-h2">Get automated swing level analysis</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              TradCopilot calculates 50-bar swing highs, lows, and invalidation points automatically from live candlestick feeds on BTC, ETH, SOL, EUR/USD, and gold.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/ai-chart-analysis" className="btn-primary btn-lg">
                Explore AI Chart Analysis
              </Link>
              <Link href="/signup" className="btn-secondary btn-lg">
                Start Free Analyses
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
