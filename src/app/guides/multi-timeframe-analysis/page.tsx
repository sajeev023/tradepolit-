import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Multi-Timeframe Analysis — Align Higher-Timeframe Bias With Entries",
  description:
    "How multi-timeframe analysis works for crypto and forex day trading: choosing timeframe pairs, aligning bias with entries, and avoiding the contradictions that break the method.",
  path: "/guides/multi-timeframe-analysis",
  ogType: "article",
  publishedTime: "2026-08-23T00:00:00.000Z",
  keywords: [
    "multi timeframe analysis",
    "multiple time frame trading",
    "higher timeframe bias",
    "day trading timeframes",
    "mtf strategy",
  ],
});

const BREADCRUMBS = [
  { name: "Guides", path: "/guides" },
  { name: "Multi-Timeframe Analysis", path: "/guides/multi-timeframe-analysis" },
];

export default function MultiTimeframeAnalysisGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: "Multi-Timeframe Analysis, Step by Step",
                description:
                  "A practical workflow for aligning higher-timeframe bias with lower-timeframe entries in crypto and forex day trading.",
                path: "/guides/multi-timeframe-analysis",
                datePublished: "2026-08-23T00:00:00.000Z",
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">TRADING WORKFLOW GUIDE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Multi-timeframe analysis, <span className="tp-serif-italic">step by step.</span>
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              The same chart tells different stories at different zoom levels. Multi-timeframe
              (MTF) analysis is the discipline of letting the bigger picture set direction and
              the smaller picture pick the moment — instead of letting one timeframe argue
              with itself.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* Section 1 */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">01 · THE CORE IDEA</span>
            <h2 className="tp-h2">Bias first, entry second</h2>
            <p className="tp-body">
              Every MTF workflow reduces to two questions asked in strict order:
            </p>
            <ol className="space-y-3 list-decimal list-inside text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
              <li>
                <strong className="text-[var(--ink)]">Which way is the higher timeframe leaning?</strong>{" "}
                Trend direction, key levels, momentum regime — answered on a chart where one
                candle represents hours or days.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Where does the lower timeframe offer an entry that agrees?</strong>{" "}
                Pullbacks to value, continuation breaks, or rejections at the level the higher
                timeframe cares about.
              </li>
            </ol>
            <p className="tp-body">
              The order matters because of asymmetry: a bad entry inside a good bias usually
              survives; a good entry against a strong opposing trend rarely does. When the two
              frames disagree outright, the correct output is &ldquo;no trade&rdquo; — not a forced
              compromise.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* Section 2 */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">02 · CHOOSING PAIRS</span>
            <h2 className="tp-h2">Timeframe pairs that work for day traders</h2>
            <p className="tp-body">
              A workable rule of thumb: each step up should be roughly 4–6× the one below, so
              adjacent frames are related but not redundant:
            </p>
            <ul className="space-y-2">
              {[
                "Scalping / very short sessions: 1m entries inside a 15m bias (with 4h as context).",
                "Classic intraday: 5m–15m entries inside a 1h–4h bias.",
                "Swing-leaning day trades: 1h entries inside a 4h–1D bias.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--muted)] bg-[var(--surface)] p-3 rounded-xl border border-[var(--color-border-default)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="tp-body">
              More than three frames adds contradiction faster than clarity. Two frames with
              defined jobs — bias and trigger — plus optional context is the sustainable
              setup for most intraday traders.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* Section 3 */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">03 · THE WORKFLOW</span>
            <h2 className="tp-h2">A repeatable five-step routine</h2>
            <ol className="space-y-3 list-decimal list-inside text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
              <li>Mark the higher-timeframe regime: EMA alignment, recent swing highs/lows, and whether price is accepting above or below fair value.</li>
              <li>Write the bias down — &ldquo;long-only above X, invalid below Y&rdquo; — before opening the entry chart.</li>
              <li>On the entry timeframe, wait for the pullback, breakout, or rejection that agrees with the written bias.</li>
              <li>Size the stop to entry-timeframe volatility so normal noise can&rsquo;t knock you out of a valid higher-timeframe thesis.</li>
              <li>Journal the trade with both timeframes noted, so your review can tell apart &ldquo;bad bias&rdquo; from &ldquo;bad entry.&rdquo;</li>
            </ol>
            <p className="tp-body">
              Step 2 is the one traders skip and regret. A written bias turns MTF analysis from
              a vibe into a falsifiable plan — and gives your journal something objective to
              grade.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* Section 4 */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">04 · FAILURE MODES</span>
            <h2 className="tp-h2">How MTF analysis breaks</h2>
            <ul className="space-y-2.5">
              {[
                "Frame shopping: flipping between timeframes until one finally supports the trade you already want.",
                "Mixed indicators: reading RSI(14) on a 5m chart as if it said what daily RSI says — the same formula on different windows answers different questions.",
                "Ignoring volatility context: a 4h pullback is normal noise; the same move on a 1m chart is a trend change.",
                "No invalidation: a bias without a price level that proves it wrong isn't an analysis, it's a hope.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className="tc-rule" />

          {/* How TradCopilot helps */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">05 · IN PRACTICE</span>
            <h2 className="tp-h2">How TradCopilot supports this workflow</h2>
            <p className="tp-body">
              TradCopilot lets you run AI analyses across selectable timeframes from 1 minute
              to 1 week on nine instruments — BTC, ETH, SOL, EUR/USD, GBP/USD, USD/JPY, gold,
              NASDAQ, S&P 500 — with RSI, MACD, EMA alignment, ATR, VWAP, and swing levels
              recomputed per timeframe from live candles. The structured output states its bias
              and invalidation level explicitly, which slots directly into step 2 of the
              routine above.
            </p>
            <p className="tp-body">
              The{" "}
              <Link href="/trading-journal" className="text-[var(--accent)] hover:underline">
                session journal
              </Link>{" "}
              then keeps the bias-vs-entry distinction alive in review, and{" "}
              <Link href="/risk-management" className="text-[var(--accent)] hover:underline">
                risk guardrails
              </Link>{" "}
              warn when frustration starts overriding the written plan. Educational tool only —
              not financial advice.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* Related */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">KEEP READING</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/guides/technical-indicators" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Technical Indicators <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">RSI, MACD, EMA, ATR, VWAP.</p>
              </Link>
              <Link href="/guides/support-and-resistance" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Support &amp; Resistance <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Levels that hold up.</p>
              </Link>
              <Link href="/guides/trading-discipline" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Trading Discipline <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Follow your own plan.</p>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Analyze any timeframe in seconds</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Run the same disciplined read across 1m to 1W charts with live data — free plan
              included, no card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/ai-chart-analysis" className="btn-secondary btn-lg">
                See the Analysis Engine <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
