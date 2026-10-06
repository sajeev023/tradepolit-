import Link from "next/link";
import { Suspense } from "react";
import { Mail } from "lucide-react";
import { Mark } from "@/components/shell/mark";
import { CapabilityStrip } from "@/components/landing/capability-strip";
import { BRAND } from "@/lib/brand";

import { SlimNav } from "@/components/landing/slim-nav";
import { HeroCTA } from "@/components/landing/hero-cta";
import { MastheadPrice } from "@/components/landing/masthead-price";
import { HeroWorkbench } from "@/components/landing/hero-workbench";
import { LiveTicker } from "@/components/landing/live-ticker";
import { MetricsBand } from "@/components/landing/metrics-band";
import { MarketPulse } from "@/components/landing/market-pulse";
import { HowItWorks } from "@/components/landing/how-it-works";
import { BehavioralReplay } from "@/components/landing/behavioral-replay";
import { FounderStory } from "@/components/landing/founder-story";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { FinalCta } from "@/components/landing/final-cta";
import { StickyMobileCta } from "@/components/landing/sticky-mobile-cta";
import { Reveal } from "@/components/ui/reveal";
import { ScrollParallax } from "@/components/ui/scroll-parallax";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, softwareApplicationJsonLd, faqPageJsonLd } from "@/lib/seo";
import { HOME_FAQS } from "@/lib/faq-data";

export const metadata = buildMetadata({
  titleAbsolute: true,
  title: "TradePilot | AI Trading Copilot for Crypto & Forex Analysis",
  description:
    "Read-only AI trading copilot for crypto & forex day traders: live chart analysis with RSI, MACD, EMA & ATR, automated session journaling, behavioral guardrails, and risk tools. Free plan included.",
  path: "/",
  keywords: [
    "AI trading copilot",
    "AI trading assistant",
    "crypto chart analysis tool",
    "forex market analysis",
    "trading discipline",
  ],
});

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased overflow-x-hidden">
      {/* Product + FAQ structured data. The FAQPage schema mirrors the exact
          questions rendered by <FaqAccordion /> below (HOME_FAQS). */}
      <JsonLd
        data={[softwareApplicationJsonLd(), faqPageJsonLd(HOME_FAQS)]}
      />

      {/* ━━━ 1 · SLIM NAV (60px) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SlimNav
        items={[
          { label: "How it works", href: "#how-it-works" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
        ]}
      />

      {/* ━━━ HERO — one promise, then the live product ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="relative">
        {/* horizon: a single lit line the page sits on — identity, not a gradient blob */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[420px] h-px sm:top-[470px]" style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.55) 25%, rgba(var(--accent-rgb),0.55) 75%, transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[300px] h-[260px] w-[min(900px,92%)] -translate-x-1/2 rounded-full opacity-[0.08] blur-[90px]" style={{ background: "var(--accent)" }} />

        <div className="relative mx-auto max-w-[1200px] px-4 pb-8 pt-[96px] sm:px-6 sm:pt-[132px] lg:px-10 lg:pt-[152px]">
          <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
            <div className="tp-masthead mb-6 sm:mb-8">
              <span>{BRAND.name}</span>
              <span className="tp-masthead__sep" />
              <Suspense fallback={<span className="tp-masthead__live">BTC · live</span>}>
                <MastheadPrice />
              </Suspense>
              <span className="tp-masthead__sep hidden sm:inline-block" />
              <span className="hidden sm:inline">Crypto &amp; forex day traders</span>
            </div>

            {/* H1 is the LCP element — intentionally not wrapped in Reveal. */}
            <h1 className="tp-display-xl">
              The copilot that <span className="tp-serif-italic">remembers</span> how you trade.
            </h1>

            <p className="tp-body mt-5 max-w-[600px] sm:mt-6">
              {BRAND.name} reads the chart, learns from your journal, and flags the habits that quietly cost you money.
              Read-only — it never touches your funds.
            </p>

            <div className="mt-7 w-full sm:mt-9 sm:w-auto">
              <HeroCTA centered />
            </div>
          </div>

          {/* The real product — live candles, live indicators, live price. */}
          <div className="mt-12 sm:mt-16">
            <Suspense fallback={<div className="tc-skeleton h-[320px] rounded-2xl sm:h-[420px]" />}>
              <ScrollParallax distance={14}>
                <HeroWorkbench />
              </ScrollParallax>
            </Suspense>
          </div>

          <CapabilityStrip />
        </div>
      </header>

      {/* ━━━ 3 · LIVE TICKER (real WS prices) ━━━━━━━━━━━━━━━ */}
      <section className="tc-band-alt py-2.5 sm:py-3">
        <LiveTicker />
      </section>

      {/* ━━━ 4 · METRICS BAND (count-up) ━━━━━━━━━━━━━━━━━━━━ */}
      <MetricsBand />

      {/* ━━━ 5 · HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <HowItWorks />

      {/* ━━━ 6 · MARKET PULSE (real Fear & Greed + live prices) ━ */}
      <MarketPulse />

      <hr className="tc-rule max-w-[1120px] mx-auto" />

      {/* ━━━ 6 · BEHAVIORAL SHOWCASE ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <BehavioralReplay />

      {/* ━━━ 7 · COMPRESSED FOUNDER BAND ━━━━━━━━━━━━━━━━━━━ */}
      <FounderStory />

      {/* ━━━ 8 · PRICING (calculator above + 2 cards) ━━━━━━ */}
      <PricingSection />

      <hr className="tc-rule max-w-[1120px] mx-auto" />

      {/* ━━━ 9 · FAQ (skeptic first-person) ━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="tc-section tc-section--narrow scroll-mt-20">
        <Reveal blur className="text-center space-y-2.5 sm:space-y-3 mb-6 sm:mb-10 lg:mb-12">
          <span className="tp-eyebrow-mono">05 / Questions</span>
          <h2 className="font-serif text-[clamp(32px,6vw,56px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
            Questions, <em className="text-[var(--accent)]">answered.</em>
          </h2>
        </Reveal>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
        <p className="text-center mt-6 sm:mt-8 text-[13px] text-[var(--muted)]">
          More questions about markets, pricing, privacy, and how the analysis works?{" "}
          <Link href="/faq" className="text-[var(--accent)] hover:underline font-medium">
            Read the full FAQ
          </Link>
          .
        </p>
      </section>

      {/* ━━━ 10 · FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FinalCta />

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[var(--color-border-subtle)] py-8 sm:py-10 lg:py-12 bg-[var(--bg-band)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <Mark size={26} />
              <span className="text-sm font-semibold tracking-tight text-[var(--ink)]">{BRAND.name}</span>
              <span className="text-[10px] font-mono text-[var(--muted)] border border-[var(--color-border-default)] rounded px-1.5 py-0.5 ml-1">
                Read-only · No broker access
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] text-[var(--muted)]">
              <a
                href="https://x.com/tradcopilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
                aria-label="TradePilot on X"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@tradcopilot</span>
              </a>

              <a
                href="https://linkedin.com/company/tradcopilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
                aria-label="TradePilot on LinkedIn"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c.97 0 1.75-.79 1.75-1.76s-.78-1.75-1.75-1.75a1.75 1.75 0 0 0 0 3.51m1.39 9.74v-8.37H5.07v8.37h2.78z" />
                </svg>
                <span>LinkedIn</span>
              </a>

              <a
                href="mailto:hello@tradcopilot.com"
                className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
              >
                <Mail size={13} />
                hello@tradcopilot.com
              </a>
            </div>
          </div>

          <p className="text-[11px] text-[var(--muted)] max-w-2xl leading-relaxed">
            TradePilot is a read-only{" "}
            <Link href="/ai-trading-copilot" className="underline decoration-[var(--color-border-subtle)] underline-offset-2 hover:text-[var(--ink)]">
              AI trading copilot
            </Link>{" "}
            for crypto and forex day traders. Does not execute trades, hold funds, or connect to your brokerage.
            Analytical workstation for educational and discipline purposes only.
          </p>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
            <p className="text-[11px] sm:text-xs text-[var(--muted)]">© {year} TradCopilot Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-[11px] sm:text-xs text-[var(--muted)]">
              <Link href="/features" className="hover:text-[var(--ink)] transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-[var(--ink)] transition-colors">Pricing</Link>
              <Link href="/ai-chart-analysis" className="hover:text-[var(--ink)] transition-colors">AI Chart Analysis</Link>
              <Link href="/trading-journal" className="hover:text-[var(--ink)] transition-colors">Trading Journal</Link>
              <Link href="/risk-management" className="hover:text-[var(--ink)] transition-colors">Risk Management</Link>
              <Link href="/trading-alerts" className="hover:text-[var(--ink)] transition-colors">Trading Alerts</Link>
              <Link href="/guides" className="hover:text-[var(--ink)] transition-colors">Guides</Link>
              <Link href="/faq" className="hover:text-[var(--ink)] transition-colors">FAQ</Link>
              <Link href="/about" className="hover:text-[var(--ink)] transition-colors">About</Link>
              <Link href="/changelog" className="hover:text-[var(--accent)] font-medium transition-colors">Changelog</Link>
              <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</Link>
              <Link href="/refund" className="hover:text-[var(--ink)] transition-colors">Refund</Link>
              <Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors">Disclaimer</Link>
              <Link href="/cookies" className="hover:text-[var(--ink)] transition-colors">Cookies</Link>
              <Link href="/acceptable-use" className="hover:text-[var(--ink)] transition-colors">Use Policy</Link>
              <Link href="/login" className="hover:text-[var(--ink)] transition-colors">App Login</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ━━━ STICKY MOBILE CTA (after first scroll) ━━━━━━━━ */}
      <StickyMobileCta />
    </div>
  );
}