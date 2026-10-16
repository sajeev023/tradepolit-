import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "TradCopilot vs ChatGPT for Trading Analysis — Factual Breakdown",
  description:
    "Why general chatbots hallucinate on market data, and how TradCopilot uses deterministic server-side indicator calculations, live OHLCV feeds, and consistency gates.",
  path: "/compare/tradcopilot-vs-chatgpt",
  keywords: [
    "tradcopilot vs chatgpt",
    "can chatgpt analyze charts",
    "chatgpt for trading analysis",
    "ai trading analysis vs chatgpt",
    "deterministic trading indicators",
  ],
});

const BREADCRUMBS = [
  { name: "Compare", path: "/compare" },
  { name: "TradCopilot vs ChatGPT", path: "/compare/tradcopilot-vs-chatgpt" },
];

const COMPARISON_FAQS: FaqItem[] = [
  {
    question: "Why does ChatGPT hallucinate when analyzing price charts?",
    answer:
      "Large language models are general-purpose text predictors. When you upload a screenshot or paste price numbers into ChatGPT, it attempts to visually or textually estimate indicator values and support/resistance zones. Because it lacks a deterministic math engine, it frequently invents numbers and proposes inconsistent stops and targets.",
  },
  {
    question: "How does TradCopilot prevent mathematical hallucinations?",
    answer:
      "TradCopilot computes RSI(14), MACD(12,26,9), EMA alignment (9/21/50), ATR, VWAP, and swing levels using deterministic server-side mathematical code from live Binance and TwelveData OHLCV feeds BEFORE any AI model receives the data. The AI explains the calculated numbers; it never guesses them.",
  },
  {
    question: "Does TradCopilot validate AI responses before showing them?",
    answer:
      "Yes. Every response passes an automated consistency validator. If an AI proposes a Bullish bias but places a stop-loss above the entry price, or proposes a reward-to-risk under 1.5, the output is rejected and discarded during the multi-model race.",
  },
];

const COMPARISON_ROWS = [
  {
    category: "Market Data Source",
    chatgpt: "Pasted text or image uploads (no live candle feed)",
    tradcopilot: "Live Binance WebSocket & TwelveData OHLCV feeds",
  },
  {
    category: "Technical Indicator Computation",
    chatgpt: "Model guesses from image pixels or text prompts",
    tradcopilot: "Deterministic server-side calculation (exact math)",
  },
  {
    category: "Model Race & Redundancy",
    chatgpt: "Single model execution (OpenAI only)",
    tradcopilot: "Parallel race: Groq, Gemini 2.0, NVIDIA NIM, OpenAI",
  },
  {
    category: "Output Consistency Validation",
    chatgpt: "None (outputs hallucinated or conflicting levels)",
    tradcopilot: "Strict validation gate (stop side vs bias, R:R > 1.5)",
  },
  {
    category: "Session Trading Memory",
    chatgpt: "Context window resets; no persistent trading journal",
    tradcopilot: "Persistent database memory of your last 20 trades",
  },
  {
    category: "Behavioral Discipline Guardrails",
    chatgpt: "No awareness of your emotional state or loss streaks",
    tradcopilot: "Active flags for revenge trading & overtrading",
  },
];

export default function TradcopilotVsChatgptPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(COMPARISON_FAQS),
            ]}
          />

          {/* ── Masthead ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">AI ARCHITECTURE COMPARISON</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              TradCopilot vs ChatGPT: <span className="tp-serif-italic">Math first vs guessing first.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Asking a general-purpose LLM to read a chart is like asking a poet to do accounting from a blurry photo. Here is why purpose-built deterministic infrastructure is essential for trading analysis.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Core Dilemma ── */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="tc-card space-y-3 border-[rgba(var(--red-rgb),0.2)]">
              <div className="flex items-center gap-2 text-[var(--red)] font-mono text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle size={15} /> General-Purpose Chatbots
              </div>
              <h2 className="tp-h3 !text-[17px]">Guessing from visual pixels</h2>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                When you paste a screenshot into a generic chat interface, the model estimates indicator levels visually. It doesn&apos;t know the true closing prices, cannot verify volume data, and has no mathematical constraints on stop placement.
              </p>
            </div>

            <div className="tc-card space-y-3 border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.02)]">
              <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 size={15} /> TradCopilot Pipeline
              </div>
              <h2 className="tp-h3 !text-[17px]">Deterministic server computation</h2>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                TradCopilot computes every RSI, MACD, ATR, EMA alignment, and swing high/low from raw OHLCV candle numbers. The AI models receive already-computed figures and simply synthesize the technical narrative.
              </p>
            </div>
          </section>

          {/* ── Comparison Table ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">DETAILED COMPARISON MATRIX</span>
            <h2 className="tp-h2">Architectural differences</h2>
            <div className="overflow-x-auto tc-card !p-0">
              <table className="w-full min-w-[600px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-strong)]">
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Dimension</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">ChatGPT / General Chat</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">TradCopilot</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.category} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{row.category}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.chatgpt}</td>
                      <td className="px-4 py-3 text-[var(--ink)] font-medium">{row.tradcopilot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Safety & Integrity ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">TELEMETRY TRANSPARENCY</span>
            <h2 className="tp-h2">Every reading stamped with exact inputs</h2>
            <p className="tp-body max-w-[65ch]">
              Every TradCopilot analysis carries a transparent telemetry block with the exact asset price, timestamp, and candle interval analyzed. If market feeds go offline, the system informs you rather than making up numbers to keep a conversation going.
            </p>
          </section>

          {/* ── FAQ ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Questions &amp; answers</h2>
            <div className="space-y-3">
              {COMPARISON_FAQS.map((faq) => (
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
            <h2 className="tp-h2">See deterministic analysis in action</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Analyze BTC, ETH, SOL, EUR/USD, or gold with mathematical verification.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Analyses
              </Link>
              <Link href="/ai-chart-analysis" className="btn-secondary btn-lg">
                How It Works
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
