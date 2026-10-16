import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, ShieldAlert, BarChart2, Tag, History } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo";
import { FAQS } from "@/lib/faq-data";

export const metadata: Metadata = buildMetadata({
  title: "AI Trading Journal — Automated Session Logging & Behavioral Memory",
  description:
    "An automated trade journal that logs entries, exits, emotions, and mistakes. Feeds your last 20 trades into AI context to detect revenge trading and overtrading.",
  path: "/trading-journal",
  keywords: [
    "ai trading journal",
    "automated trade journal",
    "trading psychology tool",
    "revenge trading detector",
    "crypto trade journal",
    "forex trade logger",
  ],
});

const BREADCRUMBS = [
  { name: "Features", path: "/features" },
  { name: "Trading Journal", path: "/trading-journal" },
];

const JOURNAL_FAQS: FaqItem[] = [
  {
    question: "How does the trade journal feed into the AI analysis?",
    answer:
      "When you request an AI chart analysis, your last 20 logged trades (including direction, win/loss status, emotion tags, and mistake tags) are summarized as contextual memory. If you recently suffered two consecutive losses on BTC and tagged them as FOMO, the AI explicitly notes your elevated risk state and warns against chasing low-grade setups.",
  },
  {
    question: "Do I have to manually enter every trade?",
    answer:
      "You log your executed trade details (symbol, entry price, exit price, size, stop loss, and tags) in a streamlined interface designed for rapid entry in under 15 seconds. TradCopilot is read-only and deliberately does not connect to your exchange keys, ensuring complete security.",
  },
  {
    question: "What emotion and mistake tags does TradCopilot track?",
    answer:
      "Emotion tags include Confident, Fearful, Greedy, Revenge, FOMO, Disciplined, and Neutral. Mistake tags include FOMO Entry, Overleveraging, Moving Stop Loss, Early Exit, Revenge Trade, No Plan, and Poor Sizing.",
  },
];

const JOURNAL_CAPABILITIES = [
  {
    icon: Tag,
    title: "Emotion & Mistake Tagging",
    description:
      "Every trade captures your mental state alongside numerical P&L. Track how often FOMO or Revenge tags correlate with drawdown vs disciplined execution.",
  },
  {
    icon: Brain,
    title: "Persistent Session Memory",
    description:
      "Your trading history isn't static archive data. It actively powers the AI prompt context, giving the models situational awareness of your current session momentum.",
  },
  {
    icon: ShieldAlert,
    title: "Revenge & Overtrading Guardrails",
    description:
      "Identifies when a new trade is opened within 30 minutes of a loss or when you exceed 5 trades in a single session, triggering actionable warnings before you execute.",
  },
  {
    icon: BarChart2,
    title: "R-Multiple & Expectancy Metrics",
    description:
      "Calculates realized R-multiples, win rate, average win-to-loss ratio, and profit factor to measure true statistical edge rather than raw dollar noise.",
  },
  {
    icon: History,
    title: "Weekly AI Performance Review (Pro)",
    description:
      "Synthesizes your weekly trading log into a structured 5-section report highlighting execution discipline, top recurring mistakes, and risk distribution.",
  },
  {
    icon: BookOpen,
    title: "Screenshot & Lessons Capture",
    description:
      "Attach chart screenshots and post-trade reflections to preserve key technical lessons for subsequent market cycles.",
  },
];

export default function TradingJournalPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(JOURNAL_FAQS),
            ]}
          />

          {/* ── Masthead ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">BEHAVIORAL JOURNALING</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              An AI trading journal that remembers <span className="tp-serif-italic">how you behave.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Most trading journals are passive spreadsheets that you fill out and never revisit. TradCopilot turns your journal into an active behavioral guardrail — logging emotions, mistakes, and R-multiples to protect your capital during emotional extremes.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Journaling
              </Link>
              <Link href="/features" className="btn-secondary btn-lg">
                Explore All Features
              </Link>
            </div>
          </header>

          <hr className="tc-rule" />

          {/* ── Core Value Section ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">01 · ACTIVE CONTEXT</span>
            <h2 className="tp-h2">Why passive spreadsheets fail retail traders</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Retail drawdown rarely happens because a trader lacks a technical chart indicator. It happens because after two consecutive stop-outs, emotional fatigue takes over: sizing increases to &ldquo;make it back,&rdquo; setups are forced on lower timeframes, and risk rules are abandoned.
              </p>
              <p className="tp-body">
                TradCopilot bridges your past executions with your next chart analysis. When you analyze a setup, the engine checks your last 20 logged trades. If it detects a streak of losses tagged with <span className="text-[var(--red)] font-medium">Revenge</span> or <span className="text-[var(--amber)] font-medium">FOMO</span>, the terminal warns you directly before you risk capital.
              </p>
            </div>
          </section>

          {/* ── Grid Capabilities ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">02 · WORKSPACE CAPABILITIES</span>
            <h2 className="tp-h2">Engineered for honest performance tracking</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {JOURNAL_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="tc-card space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] text-[var(--accent)]">
                        <Icon size={16} />
                      </div>
                      <h3 className="tp-h3 !text-[15px] font-semibold">{cap.title}</h3>
                    </div>
                    <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Data Tagging Breakdown ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">03 · TAXONOMY</span>
            <h2 className="tp-h2">Structured emotion and mistake taxonomy</h2>
            <p className="tp-body max-w-[65ch]">
              Numbers show what happened; tags explain why it happened. TradCopilot standardizes post-trade reviews with two structured dimensions:
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="tc-terminal p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                  Emotion States Tracked
                </h3>
                <ul className="space-y-1.5 text-xs text-[var(--muted)]">
                  <li><strong className="text-[var(--ink)]">Confident:</strong> Executed according to pre-defined plan.</li>
                  <li><strong className="text-[var(--ink)]">Disciplined:</strong> Followed stop loss and size rules strictly.</li>
                  <li><strong className="text-[var(--ink)]">Neutral:</strong> Routine technical execution without bias.</li>
                  <li><strong className="text-[var(--amber)]">Fearful:</strong> Exited early before target out of anxiety.</li>
                  <li><strong className="text-[var(--amber)]">Greedy:</strong> Held through take-profit hoping for more.</li>
                  <li><strong className="text-[var(--red)]">FOMO:</strong> Chased price after a breakout already extended.</li>
                  <li><strong className="text-[var(--red)]">Revenge:</strong> Re-entered immediately to recover recent loss.</li>
                </ul>
              </div>

              <div className="tc-terminal p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                  Execution Mistakes Tagged
                </h3>
                <ul className="space-y-1.5 text-xs text-[var(--muted)]">
                  <li><strong className="text-[var(--ink)]">FOMO Entry:</strong> Buying near resistance or selling into support.</li>
                  <li><strong className="text-[var(--ink)]">Overleveraging:</strong> Taking size exceeding account risk parameters.</li>
                  <li><strong className="text-[var(--ink)]">Moving Stop Loss:</strong> Widening stop as price approached invalidation.</li>
                  <li><strong className="text-[var(--ink)]">Early Exit:</strong> Cutting winning trade before target without technical reason.</li>
                  <li><strong className="text-[var(--ink)]">Revenge Trade:</strong> Unplanned entry within minutes of a loss.</li>
                  <li><strong className="text-[var(--ink)]">No Plan:</strong> Entering without pre-calculated invalidation point.</li>
                  <li><strong className="text-[var(--ink)]">Poor Sizing:</strong> Inconsistent unit sizing across setups.</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Related Guides & Links ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">RELATED RESOURCES</span>
            <h2 className="tp-h2">Deepen your trading process</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/guides/trading-discipline" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-sm">
                  Trading Discipline Guide <ArrowRight size={14} />
                </span>
                <p className="tc-card__body mt-1 text-xs">
                  How to build systematic process rules that withstand losing streaks.
                </p>
              </Link>

              <Link href="/risk-management" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-sm">
                  Risk Management Workspace <ArrowRight size={14} />
                </span>
                <p className="tc-card__body mt-1 text-xs">
                  Fixed-fractional position sizing calculator and leverage guardrails.
                </p>
              </Link>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Trading journal FAQ</h2>
            <div className="space-y-3">
              {JOURNAL_FAQS.map((faq) => (
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
            <span className="tp-eyebrow-mono block">START JOURNALING TODAY</span>
            <h2 className="tp-h2">Track your trades with behavioral awareness</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Free forever on the Free Plan. Log trades, capture mistake tags, and gain situational memory on every chart analysis.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Create Free Account
              </Link>
              <Link href="/pricing" className="btn-secondary btn-lg">
                View Pricing
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
