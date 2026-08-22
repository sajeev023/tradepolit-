import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "TradCopilot vs TradingView — How TradCopilot Complements TradingView",
  description:
    "A factual comparison of TradingView and TradCopilot. TradCopilot uses TradingView for charts while adding deterministic AI analysis, session journaling, and behavioral risk guardrails.",
  path: "/compare/tradcopilot-vs-tradingview",
  keywords: [
    "tradcopilot vs tradingview",
    "tradingview ai alternative",
    "ai trading copilot vs tradingview",
    "tradingview companion tools",
    "automated trading journal",
  ],
});

const BREADCRUMBS = [
  { name: "Compare", path: "/compare" },
  { name: "TradCopilot vs TradingView", path: "/compare/tradcopilot-vs-tradingview" },
];

const COMPARISON_FAQS: FaqItem[] = [
  {
    question: "Do I have to choose between TradCopilot and TradingView?",
    answer:
      "No. In fact, TradCopilot is designed to work alongside TradingView. The charts inside the TradCopilot workspace are powered directly by the official TradingView widget. You keep your familiar charting interface while gaining TradCopilot's AI setup evaluation, deterministic indicator readouts, and behavioral journaling.",
  },
  {
    question: "Can TradingView do automated behavioral discipline tracking?",
    answer:
      "TradingView focuses purely on charting, drawing tools, Pine Script indicators, and community social feeds. It does not provide session trade journaling with emotion/mistake tagging, nor does it warn against revenge trading or overtrading based on your recent loss history.",
  },
  {
    question: "How do the AI capabilities differ?",
    answer:
      "TradingView does not synthesize multi-model AI theses with strict invalidation levels from live OHLCV feeds. TradCopilot runs a server-side race across Groq, Gemini, NVIDIA, and OpenAI to explain setups and audits them with an internal consistency validator before display.",
  },
];

const COMPARISON_TABLE = [
  {
    feature: "Interactive Candlestick Charting",
    tradingview: "Industry Standard (Native)",
    tradcopilot: "Powered by Embedded TradingView Widget",
  },
  {
    feature: "Pine Script Custom Indicators",
    tradingview: "Yes (Deep Custom Scripting)",
    tradcopilot: "No (Focused Standard Indicator Suite)",
  },
  {
    feature: "Deterministic AI Chart Analysis",
    tradingview: "No",
    tradcopilot: "Yes (Multi-Model Race + Consistency Gates)",
  },
  {
    feature: "Structured Invalidation Levels",
    tradingview: "Manual User Drawings Only",
    tradcopilot: "Automated with Plain-Language Rationale",
  },
  {
    feature: "Session Trade Journaling",
    tradingview: "Basic / Manual Paper Trading",
    tradcopilot: "Integrated Journal with Emotion & Mistake Tags",
  },
  {
    feature: "Revenge Trading & Overtrading Warnings",
    tradingview: "No",
    tradcopilot: "Yes (Active Behavioral Guardrails)",
  },
  {
    feature: "Position Sizing & Risk Calculator",
    tradingview: "Manual Tool",
    tradcopilot: "Integrated Decimal Risk Math & Forex Lots",
  },
  {
    feature: "Read-Only / Non-Custodial Architecture",
    tradingview: "Broker Connect Available",
    tradcopilot: "Strictly Read-Only (Cannot Execute Orders)",
  },
];

export default function TradcopilotVsTradingviewPage() {
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
            <span className="tp-eyebrow-mono block pt-2">OBJECTIVE COMPARISON</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              TradCopilot vs TradingView: <span className="tp-serif-italic">How they work together.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              TradingView is the premier charting platform in the world. TradCopilot is an AI decision-support and behavioral workspace built on top of it. Here is an honest, objective breakdown of their respective strengths.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Summary Cards ── */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="tc-card space-y-3">
              <span className="tp-eyebrow-mono text-[var(--muted)]">CHARTING &amp; SCRIPTING</span>
              <h2 className="tp-h3 !text-[18px]">TradingView</h2>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Exceptional for drawing chart patterns, writing bespoke Pine Script indicators, backtesting complex algorithms, and engaging in a global social community of technical analysts.
              </p>
            </div>

            <div className="tc-card space-y-3 border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.02)]">
              <span className="tp-eyebrow-mono text-[var(--accent)]">DECISION SUPPORT &amp; DISCIPLINE</span>
              <h2 className="tp-h3 !text-[18px]">TradCopilot</h2>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Exceptional for turning live indicators into structured AI trade hypotheses, calculating exact position sizes, tracking session trades with emotion tags, and stopping revenge trading.
              </p>
            </div>
          </section>

          {/* ── Comparison Table ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">SIDE-BY-SIDE FEATURE MATRIX</span>
            <h2 className="tp-h2">Capability comparison</h2>
            <div className="overflow-x-auto tc-card !p-0">
              <table className="w-full min-w-[600px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-strong)]">
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Feature</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">TradingView</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold">TradCopilot</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_TABLE.map((row) => (
                    <tr key={row.feature} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{row.feature}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.tradingview}</td>
                      <td className="px-4 py-3 text-[var(--ink)] font-medium">{row.tradcopilot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Workflow Integration ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">INTEGRATION PHILOSOPHY</span>
            <h2 className="tp-h2">Why we embed TradingView charts</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                We didn&apos;t reinvent candlestick rendering because TradingView already built the best charting library in the industry. TradCopilot embeds TradingView directly in the analysis terminal, allowing you to use professional candles while receiving server-calculated RSI, MACD, and AI invalidation theses alongside the chart.
              </p>
              <p className="tp-body">
                You can also export high-resolution PNG snapshot cards of any TradCopilot analysis to share across your trading channels or archive in your personal notes.
              </p>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Comparison FAQ</h2>
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
            <h2 className="tp-h2">Try TradCopilot alongside your charts</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Explore the workspace with 5 free analyses per day and automated trade journaling.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Today
              </Link>
              <Link href="/features" className="btn-secondary btn-lg">
                View Features
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
