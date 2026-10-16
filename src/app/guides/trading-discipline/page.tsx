import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert, HeartCrack, Flame, CheckCircle } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Trading Discipline Guide — Managing Losing Streaks & Preventing Revenge Trading",
  description:
    "A psychological and systematic framework for trading discipline. Learn how to prevent tilt, eliminate revenge trading, and protect your capital during drawdown periods.",
  path: "/guides/trading-discipline",
  ogType: "article",
  publishedTime: "2026-08-22T00:00:00.000Z",
  keywords: [
    "trading discipline guide",
    "how to stop revenge trading",
    "trading psychology",
    "managing losing streaks in trading",
    "overtrading prevention",
    "trading emotional control",
  ],
});

const BREADCRUMBS = [
  { name: "Guides", path: "/guides" },
  { name: "Trading Discipline", path: "/guides/trading-discipline" },
];

export default function TradingDisciplineGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: "The Systematic Guide to Trading Discipline & Tilt Prevention",
                description:
                  "Why willpower fails in trading, how cognitive biases trigger revenge trading, and how to build automated guardrails that protect your edge.",
                path: "/guides/trading-discipline",
                datePublished: "2026-08-22T00:00:00.000Z",
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">BEHAVIORAL PSYCHOLOGY GUIDE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              The Systematic Guide to <span className="tp-serif-italic">Trading Discipline.</span>
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              Willpower is a finite resource. In high-volatility markets, relying on sheer willpower to resist revenge trading or overtrading almost always fails. Sustainable trading requires system-level constraints.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Section 1: Anatomy of Revenge Trading ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">01 · EMOTIONAL CYCLES</span>
            <h2 className="tp-h2">The anatomy of a revenge trade</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Revenge trading is an emotional response to loss where the trader abandons their strategy to immediately win back lost capital. It typically follows a predictable sequence:
              </p>

              <div className="space-y-3">
                <div className="tc-card space-y-1 border-l-2 border-l-[var(--red)]">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">1. The Trigger Loss</h3>
                  <p className="text-xs text-[var(--muted)]">A normal technical stop-out occurs, but the trader takes it personally as a failure or unfair market manipulation.</p>
                </div>
                <div className="tc-card space-y-1 border-l-2 border-l-[var(--amber)]">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">2. Urgency &amp; Sizing Spike</h3>
                  <p className="text-xs text-[var(--muted)]">The trader re-enters within 15 minutes with 2× or 3× standard position size to recoup the loss in a single move.</p>
                </div>
                <div className="tc-card space-y-1 border-l-2 border-l-[var(--red)]">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">3. The Compounded Drawdown</h3>
                  <p className="text-xs text-[var(--muted)]">The forced setup fails, turning a controlled 1% loss into a catastrophic 5% to 15% account drawdown.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 2: Overtrading Trap ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">02 · FRICTION &amp; SPREADS</span>
            <h2 className="tp-h2">Why overtrading drains accounts quietly</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                While revenge trading destroys accounts quickly, overtrading is a slow, quiet leak. Every transaction incurs exchange fees, taker costs, and bid-ask spreads.
              </p>
              <p className="tp-body">
                More critically, human decision quality degrades rapidly with fatigue. The sixth or seventh trade of a 4-hour session rarely satisfies institutional A+ setup quality. In most cases, it is bored clicking disguised as market participation.
              </p>
            </div>
          </section>

          {/* ── Section 3: 4 Rules ── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono block">03 · OPERATIONAL RULES</span>
            <h2 className="tp-h2">Four operational rules for capital preservation</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="tc-card space-y-2">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} /> The 30-Minute Cooldown
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  After closing a losing trade, step away from order entry for at least 30 minutes. Let the physiological cortisol response subside before assessing new charts.
                </p>
              </div>

              <div className="tc-card space-y-2">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} /> Maximum Daily Loss Limit
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Establish a firm max daily loss (e.g. 3%). If reached, the trading day is officially finished regardless of how tempting current market setups appear.
                </p>
              </div>

              <div className="tc-card space-y-2">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} /> Structured Post-Trade Tagging
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Tag every trade in your journal with its dominant emotion and any execution mistakes. Reviewing your mistake patterns weekly makes recurring errors undeniable.
                </p>
              </div>

              <div className="tc-card space-y-2">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} /> Asymmetric Expectancy
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Only take setups offering a minimum reward-to-risk ratio of 1.5:1. Never cut winning trades prematurely while letting losing trades run past your stop.
                </p>
              </div>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-8 text-center space-y-4">
            <span className="tp-eyebrow-mono block">BUILT-IN BEHAVIORAL GUARDRAILS</span>
            <h2 className="tp-h2">Put behavioral guardrails on your desk</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              TradCopilot monitors your last 20 logged trades and actively warns you when revenge trading, overtrading, or sizing spikes occur.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/trading-journal" className="btn-primary btn-lg">
                Explore Trade Journal
              </Link>
              <Link href="/risk-management" className="btn-secondary btn-lg">
                Risk Management Tools
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
