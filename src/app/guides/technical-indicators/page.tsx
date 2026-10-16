import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "RSI, MACD, EMA, ATR & VWAP — Technical Indicators Explained",
  description:
    "What RSI, MACD, EMA, ATR, and VWAP each measure, how they are calculated, where they mislead, and how they fit together in one structured read of a crypto or forex chart.",
  path: "/guides/technical-indicators",
  ogType: "article",
  publishedTime: "2026-08-23T00:00:00.000Z",
  keywords: [
    "rsi explained",
    "macd explained",
    "ema trading",
    "atr indicator",
    "vwap trading strategy",
    "technical indicators for day trading",
  ],
});

const BREADCRUMBS = [
  { name: "Guides", path: "/guides" },
  { name: "Technical Indicators", path: "/guides/technical-indicators" },
];

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm sm:text-base font-mono text-[var(--ink)] bg-[var(--color-bg-hover)] p-3 rounded border border-[var(--color-border-subtle)] overflow-x-auto">
      {children}
    </div>
  );
}

export default function TechnicalIndicatorsGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: "RSI, MACD, EMA, ATR & VWAP Explained for Day Traders",
                description:
                  "A practical guide to the five indicators that matter most in intraday crypto and forex analysis: what they measure, how they're computed, and where each one misleads.",
                path: "/guides/technical-indicators",
                datePublished: "2026-08-23T00:00:00.000Z",
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">INDICATORS GUIDE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              RSI, MACD, EMA, ATR &amp; VWAP, <span className="tp-serif-italic">explained.</span>
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              Five indicators cover most of what an intraday trader needs: momentum (RSI),
              trend shifts (MACD), trend direction (EMA), volatility (ATR), and fair value
              (VWAP). This guide explains what each computes, how to read it honestly, and
              the classic ways each one misleads.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* RSI */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">01 · MOMENTUM</span>
            <h2 className="tp-h2">RSI — Relative Strength Index</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                RSI measures the speed of recent gains versus losses on a 0–100 scale,
                smoothing price changes over a lookback window — 14 periods is the standard,
                and the setting TradCopilot uses.
              </p>
              <Formula>
                RSI = 100 − 100 / (1 + average gain / average loss)
              </Formula>
              <p className="tp-body">
                Readings above 70 are conventionally called overbought; below 30, oversold.
                The honest interpretation is narrower than that: in strong trends, RSI can
                stay overbought or oversold for extended stretches while price keeps going.
                Overbought does not mean &ldquo;sell now&rdquo; — it means momentum is stretched and
                mean reversion risk is elevated. Divergences (price makes a new high while
                RSI doesn&rsquo;t) carry more information than absolute levels alone.
              </p>
              <p className="tp-body text-[13px] text-[var(--muted)]">
                Where it misleads: treating 70/30 as automatic reversal signals in trending
                markets; ignoring the lookback window when switching timeframes.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* MACD */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">02 · TREND SHIFT</span>
            <h2 className="tp-h2">MACD — Moving Average Convergence Divergence</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                MACD tracks the relationship between two EMAs of price — conventionally the
                12 and 26 period — plus a 9-period EMA of the difference (the signal line)
                and a histogram showing the gap between them.
              </p>
              <Formula>MACD line = EMA(12) − EMA(26) · Signal = EMA(9, MACD)</Formula>
              <p className="tp-body">
                Crossovers of the MACD line above or below its signal line flag potential
                trend shifts; the histogram visualizes whether momentum behind the move is
                accelerating or fading. Because it is built from moving averages, MACD lags
                price by design — it confirms moves after they start, which makes it a
                context tool rather than an entry trigger.
              </p>
              <p className="tp-body text-[13px] text-[var(--muted)]">
                Where it misleads: acting on crossovers in sideways markets, where whipsaws
                cluster; reading histogram magnitude across different instruments as if it
                were comparable.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* EMA */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">03 · TREND DIRECTION</span>
            <h2 className="tp-h2">EMA — Exponential Moving Averages</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                An EMA weights recent prices more heavily than older ones, so it hugs price
                more closely than a simple moving average. Intraday traders commonly stack
                three: a fast EMA (9), a medium EMA (21), and a slower EMA (50).
              </p>
              <Formula>
                EMA today = price × k + EMA yesterday × (1 − k),&nbsp; k = 2/(N+1)
              </Formula>
              <p className="tp-body">
                Alignment tells a quick directional story: fast EMA above medium above slow
                describes an orderly uptrend; interleaved EMAs describe chop. Price relative
                to the 50 EMA is also the cleanest single-line regime filter most traders
                have. EMAs confirm direction — they do not predict it, and in ranging markets
                they cross constantly with little meaning.
              </p>
              <p className="tp-body text-[13px] text-[var(--muted)]">
                Where it misleads: treating every crossover as a trade; using EMAs as support
                or resistance without checking whether price has actually respected them
                recently.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ATR */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">04 · VOLATILITY</span>
            <h2 className="tp-h2">ATR — Average True Range</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                ATR averages the true range — the largest of the high-low span, the
                high-versus-prior-close gap, and the low-versus-prior-close gap — over a
                window, typically 14 periods. It answers one question: how much does this
                market typically move?
              </p>
              <Formula>True range = max(high − low, |high − prev close|, |low − prev close|)</Formula>
              <p className="tp-body">
                Its best use is sizing stops and targets to the market instead of to your
                emotions: a stop 1.5× ATR away gives noise room to breathe; a target at 2×
                ATR is plausible within the session. A rising ATR warns that fixed-pip or
                fixed-dollar stops set last week may be too tight today.
              </p>
              <p className="tp-body text-[13px] text-[var(--muted)]">
                Where it misleads: reading ATR as directional (it isn&rsquo;t — it can rise in a
                sell-off); comparing raw ATR values between instruments priced in different
                units instead of percentages.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* VWAP */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">05 · FAIR VALUE</span>
            <h2 className="tp-h2">VWAP — Volume Weighted Average Price</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                VWAP is the average price weighted by volume over a session — the price at
                which the typical participant actually transacted. Institutional desks use
                it as a execution benchmark; intraday traders use it as a magnet and a
                divider.
              </p>
              <Formula>VWAP = Σ(price × volume) / Σ(volume)</Formula>
              <p className="tp-body">
                Price repeatedly rejecting above VWAP leans bullish; persistent acceptance
                below it leans bearish. Because crypto trades around the clock, platforms
                compute it as a rolling window (TradCopilot uses a 20-bar rolling VWAP)
                rather than resetting at a daily session open like equities do — worth
                knowing before you compare readings across tools.
              </p>
              <p className="tp-body text-[13px] text-[var(--muted)]">
                Where it misleads: applying equity-style daily resets to 24/7 crypto markets;
                expecting VWAP to hold as support in high-volatility news events.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* Putting it together */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">06 · SYNTHESIS</span>
            <h2 className="tp-h2">Reading them together</h2>
            <p className="tp-body">
              No single indicator carries a trade. A structured read assigns each one a job:
              EMAs frame the regime, MACD tests whether momentum agrees, RSI flags stretch,
              ATR sizes the stop and target, VWAP marks fair value. When all five point the
              same way, the setup is coherent; when they contradict, the honest answer is
              &ldquo;no trade.&rdquo;
            </p>
            <p className="tp-body">
              That synthesis is exactly what TradCopilot automates: it computes all five
              server-side from live candles — RSI(14), MACD(12,26,9), EMA 9/21/50, ATR(14),
              rolling VWAP — then produces a written setup with bias, quality grade, entry,
              stop, target, and invalidation level.{" "}
              <Link href="/ai-chart-analysis" className="text-[var(--accent)] hover:underline">
                See how the analysis pipeline works
              </Link>
              .
            </p>
          </section>

          <hr className="tc-rule" />

          {/* Related */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">KEEP READING</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/guides/multi-timeframe-analysis" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Multi-Timeframe Analysis <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Align bias with entries.</p>
              </Link>
              <Link href="/guides/support-and-resistance" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Support &amp; Resistance <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Map levels objectively.</p>
              </Link>
              <Link href="/guides/position-sizing-guide" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Position Sizing <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Size trades with math.</p>
              </Link>
            </div>
          </section>

          {/* Disclaimer + CTA */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Let the terminal do the arithmetic</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              TradCopilot computes these exact indicators from live crypto and forex data and
              journals every analysis. Educational tool — not financial advice; see our{" "}
              <Link href="/disclaimer" className="underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--ink)]">
                disclaimer
              </Link>
              .
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/features" className="btn-secondary btn-lg">
                Explore Features
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
