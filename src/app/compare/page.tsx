import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitCompare } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compare TradCopilot — Honest Alternatives & Companion-Tool Breakdowns",
  description:
    "Factual, side-by-side comparisons of TradCopilot with the tools traders ask about: TradingView and ChatGPT. What each does well, where TradCopilot differs, and how they work together.",
  path: "/compare",
  keywords: [
    "tradcopilot comparisons",
    "ai trading copilot vs tradingview",
    "ai trading tool vs chatgpt",
    "tradingview companion tools",
  ],
});

const BREADCRUMBS = [{ name: "Compare", path: "/compare" }];

const COMPARISONS = [
  {
    href: "/compare/tradcopilot-vs-tradingview",
    name: "TradCopilot vs TradingView",
    summary:
      "Not a replacement — a complement. TradingView remains the charting layer (TradCopilot embeds its widget); TradCopilot adds deterministic AI setup analysis, session journaling, and behavioral guardrails on top.",
    points: [
      "Charting & Pine Script: TradingView's strengths",
      "AI analysis, journaling, discipline engine: TradCopilot's",
      "Designed to run side by side",
    ],
  },
  {
    href: "/compare/tradcopilot-vs-chatgpt",
    name: "TradCopilot vs ChatGPT",
    summary:
      "General-purpose chatbots guess from whatever you paste. TradCopilot computes indicators server-side from live OHLCV candles first, validates every output for internal consistency, and keeps persistent memory of your trades.",
    points: [
      "Live market data vs pasted screenshots",
      "Deterministic indicator math before any AI writes a word",
      "Structured setups with invalidation levels, not prose",
    ],
  },
];

export default function CompareHubPage() {
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
              <GitCompare size={16} />
              <span className="tp-eyebrow-mono">OBJECTIVE COMPARISONS</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              TradCopilot, compared <span className="tp-serif-italic">honestly.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Every comparison below is factual and grounded in what each product actually
              does today — including what TradCopilot deliberately does not do. Where another
              tool is stronger, we say so.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Comparison Cards ── */}
          <section className="space-y-4">
            {COMPARISONS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="tc-card group block space-y-3 hover:border-[var(--accent)] transition-colors"
              >
                <span className="tc-arrow-link font-medium text-sm">
                  {c.name} <ArrowRight size={14} />
                </span>
                <p className="text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
                  {c.summary}
                </p>
                <ul className="space-y-1.5">
                  {c.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-xs text-[var(--muted)]"
                    >
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </section>

          <hr className="tc-rule" />

          {/* ── Context ── */}
          <section className="space-y-4 max-w-[65ch]">
            <h2 className="tp-h2">How we approach comparisons</h2>
            <p className="tp-body">
              TradCopilot is a read-only AI trading copilot: it computes technical
              indicators from live candlestick data, explains setups in plain language,
              journals every session, and warns against emotional patterns like revenge
              trading. It does not execute trades, hold funds, or connect to brokers.
            </p>
            <p className="tp-body">
              That makes it a different category from charting platforms, broker terminals,
              and general-purpose chatbots — so most comparisons are less about
              &ldquo;which is better&rdquo; and more about which tool owns which part of your
              workflow. The pages above break that down feature by feature.
            </p>
            <p className="tp-body text-[13px] text-[var(--muted)]">
              New here? Start with{" "}
              <Link href="/features" className="text-[var(--accent)] hover:underline">the full feature list</Link>{" "}
              or{" "}
              <Link href="/pricing" className="text-[var(--accent)] hover:underline">pricing</Link>{" "}
              (free plan included).
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Judge it on your own charts</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Run a full analysis in the 15-minute demo — no signup, no card.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/faq" className="btn-secondary btn-lg">
                Read the FAQ
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
