import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd, type FaqItem } from "@/lib/seo";
import { FAQS } from "@/lib/faq-data";

export const metadata = buildMetadata({
  title: "AI Chart Analysis for Crypto & Forex — How It Works",
  description:
    "AI chart analysis that computes RSI, MACD, EMA, VWAP and support/resistance from live candles first, then explains the setup through a multi-model AI race.",
  path: "/ai-chart-analysis",
  keywords: [
    "ai chart analysis",
    "ai technical analysis",
    "crypto chart analysis tool",
    "automated support and resistance",
  ],
});

/** The three FAQ entries rendered on this page — kept in sync with the visible accordion below. */
const PAGE_FAQ_QUESTIONS = [
  "How does TradCopilot analyze market data?",
  "How is this different from asking ChatGPT about a chart?",
  "Does TradCopilot execute trades or give financial advice?",
];

const PAGE_FAQS = PAGE_FAQ_QUESTIONS.map((question) =>
  FAQS.find((faq) => faq.question === question)
).filter((faq): faq is FaqItem => Boolean(faq));

const ENGINE_READINGS: { reading: string; measures: string; usedFor: string }[] = [
  {
    reading: "RSI(14)",
    measures: "Momentum on a 0–100 scale",
    usedFor:
      "Spots overbought and oversold stretches and flags momentum fading against the prevailing move.",
  },
  {
    reading: "MACD(12,26,9)",
    measures: "Trend momentum, with histogram",
    usedFor:
      "Signal-line crossovers and a widening or contracting histogram show whether a move is strengthening or running out of steam.",
  },
  {
    reading: "EMA 9 / 21 / 50 alignment",
    measures: "Trend direction and order",
    usedFor:
      "Stacked averages (price above all three, fast above slow) describe an orderly trend; inversions describe breakdowns.",
  },
  {
    reading: "SMA baseline",
    measures: "Smoothed average price",
    usedFor:
      "A slower reference line for judging how far price has stretched from its mean.",
  },
  {
    reading: "ATR(14)",
    measures: "Volatility level and expansion",
    usedFor:
      "Sizes up how much the market moves per bar and whether that range is growing — context for any stop-distance discussion.",
  },
  {
    reading: "Rolling VWAP (20-bar)",
    measures: "Volume-weighted fair value",
    usedFor:
      "Tracks whether price has lost or reclaimed the level volume treats as fair value over the last 20 bars.",
  },
  {
    reading: "Volume-surge ratio",
    measures: "Participation versus recent average",
    usedFor:
      "Current bar volume against its recent norm — spikes mark conviction behind a move or exhaustion at its end.",
  },
  {
    reading: "Swing support & resistance",
    measures: "Key structural levels",
    usedFor:
      "The highest highs and lowest lows of the last 50 closes become candidate support and resistance zones.",
  },
  {
    reading: "Sweep / fake-breakout flags",
    measures: "Traps around key levels",
    usedFor:
      "Wicks that pierce a swing level but close back inside flag likely stop hunts and false breaks rather than genuine breakouts.",
  },
  {
    reading: "Session detection",
    measures: "Asia / London / New York",
    usedFor:
      "Labels which session produced the candles, because the same reading means different things at 3am and at the New York open.",
  },
  {
    reading: "Consecutive-candle streaks",
    measures: "Momentum extremes",
    usedFor:
      "Four or more same-direction closes highlight stretched conditions where chasing gets expensive.",
  },
];

const SETUP_LADDER: { grade: string; tone: string; meaning: string }[] = [
  {
    grade: "A+",
    tone: "text-[var(--green)]",
    meaning:
      "Trend, momentum, volume, and structure all point the same way on the selected timeframe.",
  },
  {
    grade: "HIGH GRADE",
    tone: "",
    meaning: "Most factors align cleanly; one or two dissent but nothing contradicts the bias.",
  },
  {
    grade: "SPECULATIVE",
    tone: "text-[var(--amber)]",
    meaning:
      "A real pattern worth noting, but conflicting evidence or thin participation argues for smaller expectations.",
  },
  {
    grade: "NO TRADE ZONE",
    tone: "text-[var(--red)]",
    meaning:
      "Readings conflict or volatility makes the risk unjustifiable. Sometimes the honest answer is no trade — and the product says so instead of manufacturing a setup to fill the screen.",
  },
];

const PIPELINE_STEPS: { title: string; body: string }[] = [
  {
    title: "Four providers race in parallel",
    body: "One analysis request fires simultaneously at Groq-hosted Llama 3.3 70B and Llama 3.1 8B, Google Gemini 2.0 Flash, an NVIDIA-hosted Llama 3.1, and OpenAI GPT-4o-mini. The first valid response wins, so you get the fastest sound answer instead of waiting on any single provider.",
  },
  {
    title: "A validity gate filters the race",
    body: "A response only counts if it parses into the required structure — regime, bias, quality, levels, rationale. Malformed or incomplete drafts are discarded mid-race, not patched after the fact.",
  },
  {
    title: "A consistency validator audits what survives",
    body: "Before anything reaches your screen, the setup is checked against itself: the stop-loss side must match the stated bias, and the reward-to-risk must clear roughly 1.5. Analyses that fail the audit are rejected outright — never quietly softened.",
  },
  {
    title: "Every data point carries an honesty tag",
    body: "Readings are labeled confirmed, estimated, or unverified, so you can see at a glance which numbers are hard calculations and which carry interpretation.",
  },
  {
    title: "Telemetry stamps the exact inputs",
    body: "Each analysis records the precise price and timestamp it was built on, so you can verify it against your own chart seconds or weeks later.",
  },
  {
    title: "Failure degrades honestly",
    body: "If every AI provider is unavailable, you get a clearly labeled indicator-only readout computed from the same candle data. If live data is stale or down, the system refuses to analyze and says why. There is no mode in which it invents numbers to keep the conversation going.",
  },
];

export default function AiChartAnalysisPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "AI Chart Analysis", path: "/ai-chart-analysis" }]} />

          <span className="tp-eyebrow-mono block mt-6 mb-4">How the engine works</span>
          <h1 className="tp-display-xl !text-2xl sm:!text-3xl lg:!text-4xl max-w-[22ch]">
            AI chart analysis, grounded in real candlestick data
          </h1>

          <div className="space-y-4 mt-6 max-w-[65ch]">
            <p className="tp-body">
              <strong className="text-[var(--ink)] font-semibold">AI chart analysis</strong> is
              the use of machine-learning models to interpret price charts — reading momentum,
              trend structure, volatility, and key levels, then explaining what they imply in
              plain language. In many tools the label hides a shortcut: a language model glances
              at a screenshot or a raw price feed and guesses the numbers behind it.
            </p>
            <p className="tp-body">
              TradCopilot runs the opposite direction. Every indicator is computed
              deterministically by server-side code from live OHLCV candles{" "}
              <em className="tp-serif-italic">before</em> any model writes a word. The AI&apos;s
              job is explanation, not measurement: it turns fixed readings into a structured
              setup, checks that setup for internal consistency, and shows its work. The models
              never invent numbers — they cannot, because the numbers arrive already calculated.
            </p>
          </div>

          {/* ── What the engine computes ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">01 · The instrument layer</span>
            <h2 className="tp-h2">What the analysis engine computes</h2>
            <p className="tp-body max-w-[65ch]">
              Before anything is &ldquo;intelligent&rdquo;, the engine reduces the selected
              timeframe&apos;s candles to a fixed set of readings. This layer is deterministic
              math — identical inputs always produce identical outputs.
            </p>

            <div className="overflow-x-auto tc-card !p-0">
              <table className="w-full min-w-[640px] text-left border-collapse text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-strong)]">
                    <th className="px-4 py-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.08em] text-[var(--muted)] font-medium">
                      Reading
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.08em] text-[var(--muted)] font-medium">
                      What it measures
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.08em] text-[var(--muted)] font-medium">
                      How the analysis uses it
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ENGINE_READINGS.map((row) => (
                    <tr key={row.reading} className="border-b border-[var(--color-border-subtle)] last:border-b-0 align-top">
                      <td className="px-4 py-3 tp-mono font-medium text-[var(--ink)] whitespace-nowrap">
                        {row.reading}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.measures}</td>
                      <td className="px-4 py-3 text-[var(--muted)] leading-relaxed">{row.usedFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="tp-body max-w-[65ch]">
              None of this depends on an AI model. If you want to go deeper on how the structural
              levels are drawn and why wicks matter as much as closes, our guide to{" "}
              <Link href="/guides/support-and-resistance" className="text-[var(--accent)] hover:underline underline-offset-2">
                support and resistance
              </Link>{" "}
              covers the mechanics.
            </p>
          </section>

          {/* ── Indicators → structured setup ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">02 · The judgment layer</span>
            <h2 className="tp-h2">From indicators to a structured setup</h2>
            <p className="tp-body max-w-[65ch]">
              The AI layer receives those computed readings plus relevant context from your own
              journal, and must return a structured analysis — not prose it can hide in. Every
              analysis states a market regime, a directional bias, a confidence level
              (HIGH / MEDIUM / LOW), and a risk level.
            </p>

            <ul className="space-y-2.5">
              {SETUP_LADDER.map((step) => (
                <li key={step.grade} className="flex items-start gap-3 text-[13px] sm:text-[14px] leading-relaxed">
                  <span className={`tp-mono shrink-0 min-w-[120px] sm:min-w-[140px] text-[11px] sm:text-xs font-semibold tracking-[0.06em] ${step.tone}`}>
                    {step.grade}
                  </span>
                  <span className="text-[var(--muted)]">{step.meaning}</span>
                </li>
              ))}
            </ul>

            <p className="tp-body max-w-[65ch]">
              Alongside the grade, each analysis proposes an entry idea, a stop-loss idea, a
              take-profit idea, and — arguably most useful — an{" "}
              <strong className="text-[var(--ink)] font-semibold">invalidation level</strong>: the
              specific price at which the thesis is simply wrong. A plain-language rationale ties
              the numbers back to sentences you can argue with.
            </p>
            <p className="tp-body max-w-[65ch]">
              These are ideas to evaluate, not commands to follow. The output is educational
              analysis of what the data shows — the evaluation, the sizing decision, and the
              execution remain entirely yours.
            </p>
          </section>

          {/* ── Multi-model pipeline ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">03 · The transparency layer</span>
            <h2 className="tp-h2">How the multi-model pipeline works</h2>
            <p className="tp-body max-w-[65ch]">
              Most &ldquo;AI analysis&rdquo; products are a single model call with no audit trail.
              TradCopilot treats the model as one stage in a pipeline that ends with validation —
              here is every stage:
            </p>

            <ol className="space-y-4">
              {PIPELINE_STEPS.map((step, i) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="tp-mono shrink-0 w-7 h-7 rounded-md bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center text-[11px] font-semibold text-[var(--accent)] mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <h3 className="tp-h3 !text-[15px] sm:!text-[16px]">{step.title}</h3>
                    <p className="text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed max-w-[62ch]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="tp-body max-w-[65ch]">
              The pattern generalizes: compute first, explain second, validate third, disclose
              always. It is slower to build than a raw chat wrapper — and it is the difference
              between an analysis you can check and one you have to trust.
            </p>
          </section>

          {/* ── Timeframes and markets ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">04 · Coverage</span>
            <h2 className="tp-h2">Timeframes and markets</h2>
            <p className="tp-body max-w-[65ch]">
              Analyses run on seven selectable timeframes — 1m, 5m, 15m, 1h, 4h, 1d, and 1W —
              across nine supported instruments: BTC/USD, ETH/USD, and SOL/USD streaming in real
              time over the Binance WebSocket (with Coinbase as fallback), plus EUR/USD,
              GBP/USD, USD/JPY, gold (XAU/USD), NASDAQ, and S&amp;P 500 served through TwelveData.
              The full data-source breakdown lives on the{" "}
              <Link href="/features" className="text-[var(--accent)] hover:underline underline-offset-2">
                features page
              </Link>
              . Charts inside the terminal itself are powered by the embedded TradingView widget —
              the indicator readings and AI setups around them come from the pipeline above.
              For the math behind those readings, see the{" "}
              <Link href="/guides/technical-indicators" className="text-[var(--accent)] hover:underline underline-offset-2">
                technical indicators guide
              </Link>{" "}
              and{" "}
              <Link href="/guides/multi-timeframe-analysis" className="text-[var(--accent)] hover:underline underline-offset-2">
                multi-timeframe analysis workflow
              </Link>
              .
            </p>
          </section>

          {/* ── Reading responsibly ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">05 · The operator</span>
            <h2 className="tp-h2">Reading an analysis responsibly</h2>
            <p className="tp-body max-w-[65ch]">
              Treat every setup as a hypothesis with an explicit invalidation point, not a
              verdict. Check it against your own plan before acting, size the position
              deliberately — the{" "}
              <Link href="/guides/position-sizing-guide" className="text-[var(--accent)] hover:underline underline-offset-2">
                position sizing guide
              </Link>{" "}
              and the built-in tools in the{" "}
              <Link href="/risk-management" className="text-[var(--accent)] hover:underline underline-offset-2">
                risk management workspace
              </Link>{" "}
              both help here — and let the invalidation level, not hope, decide when you are
              wrong.
            </p>
            <p className="tp-body max-w-[65ch]">
              Then close the loop: log the outcome in your{" "}
              <Link href="/trading-journal" className="text-[var(--accent)] hover:underline underline-offset-2">
                trading journal
              </Link>{" "}
              so future analyses are grounded in what actually happened, not what you remember.
              TradCopilot provides educational market analysis, not financial advice — see the{" "}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline underline-offset-2">
                full disclaimer
              </Link>
              .
            </p>
          </section>

          {/* ── FAQ ── */}
          <section className="mt-14 sm:mt-20 space-y-5">
            <span className="tp-eyebrow-mono block mb-2">FAQ</span>
            <h2 className="tp-h2">Frequently asked questions</h2>
            <div className="space-y-2 sm:space-y-3">
              {PAGE_FAQS.map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-[14px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-[var(--muted)] transition-transform duration-300 group-open:rotate-180 group-open:text-[var(--accent)]"
                    />
                  </summary>
                  <p className="px-3.5 pb-3.5 sm:px-5 sm:pb-5 text-[12px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <p className="text-[12px] sm:text-[13px] text-[var(--muted)]">
              More answers — pricing, alerts, privacy, and data handling — are on the{" "}
              <Link href="/faq" className="text-[var(--accent)] hover:underline underline-offset-2">
                full FAQ page
              </Link>
              .
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="mt-14 sm:mt-20">
            <div className="tc-card items-start space-y-4">
              <span className="tp-eyebrow-mono">See it on a live chart</span>
              <p className="tp-body max-w-[55ch]">
                Run an analysis on BTC, EUR/USD, or any of the nine instruments and inspect the
                telemetry yourself — exact price, exact timestamp, every tag visible.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn-primary btn-lg">
                  Start free — 5 analyses a day, no card required
                </Link>
                <Link href="/pricing" className="btn-secondary btn-lg">
                  Compare plans
                </Link>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--muted)]">
                Educational analysis only — not financial advice. Read our{" "}
                <Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors underline underline-offset-2">
                  disclaimer
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />

      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "AI Chart Analysis", path: "/ai-chart-analysis" }]),
          faqPageJsonLd(PAGE_FAQS),
        ]}
      />
    </div>
  );
}
