import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Check, AlertCircle } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Position Sizing Guide — Fixed-Fractional Risk & Forex Lot Arithmetic",
  description:
    "Master position sizing in crypto and forex: calculate dollar risk budgets, stop distances, leverage margin requirements, and standard/mini/micro lots with mathematical precision.",
  path: "/guides/position-sizing-guide",
  ogType: "article",
  publishedTime: "2026-08-22T00:00:00.000Z",
  keywords: [
    "position sizing guide",
    "fixed fractional position sizing",
    "how to calculate position size",
    "forex lot size calculation",
    "crypto leverage position size",
    "trading risk management",
  ],
});

const BREADCRUMBS = [
  { name: "Guides", path: "/guides" },
  { name: "Position Sizing Guide", path: "/guides/position-sizing-guide" },
];

export default function PositionSizingGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: "The Complete Guide to Position Sizing & Risk Arithmetic",
                description:
                  "A rigorous mathematical guide to fixed-fractional sizing, leverage exposure, and forex lot conversion for active day and swing traders.",
                path: "/guides/position-sizing-guide",
                datePublished: "2026-08-22T00:00:00.000Z",
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">RISK MANAGEMENT GUIDE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              The Complete Guide to <span className="tp-serif-italic">Position Sizing.</span>
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              Position sizing is the single most important mathematical factor in trading survival. Even a trading strategy with a 65% win rate will eventually blow up if position sizes are determined by gut feel.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Section 1: Fixed-Fractional Formula ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">01 · THE CORE EQUATION</span>
            <h2 className="tp-h2">Fixed-fractional sizing formula</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                The fixed-fractional model dictates that on every single trade, you risk a fixed, predetermined percentage (typically 1% to 2%) of your current total equity.
              </p>

              <div className="tc-terminal p-4 sm:p-6 space-y-3">
                <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">
                  The Master Formula
                </div>
                <div className="text-sm sm:text-base font-mono text-[var(--ink)] bg-[var(--color-bg-hover)] p-3 rounded border border-[var(--color-border-subtle)]">
                  Position Size = (Account Equity × Risk %) ÷ |Entry Price − Stop Loss|
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Notice that position size is an <em className="text-[var(--ink)]">output</em>, not an input. Your stop-loss placement is determined by chart market structure; your risk is determined by your account rules. The formula calculates the exact quantity to buy or sell.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 2: Crypto Example ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">02 · WORKED EXAMPLE</span>
            <h2 className="tp-h2">Calculating crypto position size (BTC/USD)</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Suppose you have a $10,000 trading account and intend to risk exactly 1% on a long Bitcoin breakout trade:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[var(--muted)] bg-[var(--surface)] p-4 rounded-xl border border-[var(--color-border-default)]">
                <li><strong className="text-[var(--ink)]">Account Equity:</strong> $10,000</li>
                <li><strong className="text-[var(--ink)]">Risk %:</strong> 1.0% ($100 maximum risk)</li>
                <li><strong className="text-[var(--ink)]">Entry Price:</strong> $64,000</li>
                <li><strong className="text-[var(--ink)]">Stop Loss:</strong> $63,200 (technical invalidation below support)</li>
                <li><strong className="text-[var(--ink)]">Stop Distance:</strong> $64,000 − $63,200 = $800</li>
                <li className="pt-2 border-t border-[var(--color-border-subtle)] text-[var(--accent)] font-semibold font-mono">
                  Calculated Position Size: $100 ÷ $800 = 0.125 BTC ($8,000 Notional Value)
                </li>
              </ul>
            </div>
          </section>

          {/* ── Section 3: Forex Lots ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">03 · FOREX ARITHMETIC</span>
            <h2 className="tp-h2">Forex lot calculations (EUR/USD, GBP/USD, USD/JPY)</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                In forex, trades are denominated in standardized contracts called lots. A standard lot is 100,000 units of the base currency, a mini lot is 10,000 units, and a micro lot is 1,000 units.
              </p>

              <div className="overflow-x-auto tc-card !p-0">
                <table className="w-full min-w-[500px] text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-strong)]">
                      <th className="px-4 py-3 font-mono text-[11px] uppercase text-[var(--muted)]">Lot Type</th>
                      <th className="px-4 py-3 font-mono text-[11px] uppercase text-[var(--muted)]">Contract Units</th>
                      <th className="px-4 py-3 font-mono text-[11px] uppercase text-[var(--muted)]">Pip Value (EUR/USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Standard Lot</td>
                      <td className="px-4 py-3 text-[var(--muted)]">100,000</td>
                      <td className="px-4 py-3 text-[var(--ink)] font-mono">$10.00 / pip</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Mini Lot</td>
                      <td className="px-4 py-3 text-[var(--muted)]">10,000</td>
                      <td className="px-4 py-3 text-[var(--ink)] font-mono">$1.00 / pip</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">Micro Lot</td>
                      <td className="px-4 py-3 text-[var(--muted)]">1,000</td>
                      <td className="px-4 py-3 text-[var(--ink)] font-mono">$0.10 / pip</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Section 4: Leverage Myth ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">04 · LEVERAGE DEMYSTIFIED</span>
            <h2 className="tp-h2">Leverage changes margin, not risk</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                A common misconception among beginner traders is that increasing leverage increases risk. In reality, your dollar risk is determined <strong className="text-[var(--ink)]">only by your position size and stop-loss distance</strong>.
              </p>
              <p className="tp-body">
                Leverage simply reduces the collateral (margin) required by your exchange to hold the trade. If you hold 0.125 BTC with an $800 stop distance, your maximum loss is $100 whether you use 1×, 5×, or 20× leverage — as long as your liquidation price is farther away than your stop loss.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Interactive CTA ── */}
          <section className="tc-terminal p-6 sm:p-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-[var(--accent)]">
              <Calculator size={18} />
              <span className="tp-eyebrow-mono">USE THE BUILT-IN CALCULATOR</span>
            </div>
            <h2 className="tp-h2">Automate your sizing math in seconds</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              TradCopilot includes an institutional risk calculator that computes crypto contracts, forex lots, margin requirements, and R-multiples directly alongside your charts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/risk-management" className="btn-primary btn-lg">
                Explore Risk Workspace
              </Link>
              <Link href="/trading-journal" className="btn-secondary btn-lg">
                View Trade Journal
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
