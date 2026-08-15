import Link from "next/link";
import { Suspense } from "react";
import { TrendingUp, Mail } from "lucide-react";

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

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased overflow-x-hidden">
      {/* ━━━ 1 · SLIM NAV (60px) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SlimNav />

      {/* ━━━ 2 · HERO — editorial masthead + full-width live desk ━━━ */}
      <header className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-10 pt-[120px] sm:pt-[140px] lg:pt-[160px] pb-14 lg:pb-20">
        {/* Editorial masthead — a publication-style dateline carrying one live
            datum (BTC, public Binance WS). Replaces the generic "who's it for"
            status chip with something that reads as a real desk. */}
        <div className="tp-masthead mb-10 sm:mb-12 lg:mb-14">
          <span>Vol. 01</span>
          <span className="tp-masthead__sep" />
          <span>The Trader&apos;s Copilot</span>
          <span className="tp-masthead__sep" />
          <Suspense fallback={<span className="tp-masthead__live">BTC&nbsp;—</span>}>
            <MastheadPrice />
          </Suspense>
          <span className="tp-masthead__sep" />
          <span>For active crypto &amp; forex day traders</span>
        </div>

        {/* Headline block — serif voice, left-aligned, room to breathe.
            The italic accent word replaces the old cyan gradient phrase:
            emphasis comes from the serif italic, not from color. The blur
            reveal is the page's one signature motion moment. */}
        <Reveal blur className="max-w-[920px] space-y-5 sm:space-y-6">
          <h1 className="tp-display-xl">
            Trade your plan —<br className="hidden sm:block" />{" "}
            <span className="tp-serif-italic">not your impulses.</span>
          </h1>

          <p className="tp-body max-w-[560px]">
            TradCopilot brings real-time chart analysis, a persistent trade journal, and behavioral
            coaching into one workspace — so every entry is prepared, reviewed, and consistent with
            your own rules.
          </p>

          <div className="pt-1">
            <HeroCTA />
          </div>
        </Reveal>

        {/* Live-data workbench — full-width "live desk" below the masthead.
            REAL candles, indicators, WS price; no fabricated AI. A subtle,
            scroll-scrubbed parallax (GSAP ScrollTrigger, reduced-motion off)
            gives the live desk a sense of depth as it passes the viewport. */}
        <div className="mt-10 lg:mt-12">
          <Suspense fallback={<div className="h-[420px] tc-skeleton rounded-2xl" />}>
            <ScrollParallax distance={14}>
              <HeroWorkbench />
            </ScrollParallax>
          </Suspense>
        </div>
      </header>

      {/* ━━━ 3 · LIVE TICKER (real WS prices) ━━━━━━━━━━━━━━━ */}
      <section className="tc-band-alt py-3">
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
        <Reveal blur className="text-center space-y-3 mb-12">
          <span className="tp-eyebrow-mono">05 — FAQ</span>
          <h2 className="tp-h2">
            The questions you&apos;d ask <span className="tc-accent-phrase">before signing up.</span>
          </h2>
        </Reveal>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
      </section>

      {/* ━━━ 10 · FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FinalCta />

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[var(--color-border-subtle)] py-10 sm:py-12 bg-[var(--bg-band)]">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center rounded-md w-6 h-6"
                style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
              >
                <TrendingUp size={13} color="#05070B" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--ink)]">TradCopilot</span>
              <span className="text-[10px] font-mono text-[var(--muted)] border border-[var(--color-border-default)] rounded px-1.5 py-0.5 ml-1">
                Read-only · No broker access
              </span>
            </div>
            <a
              href="mailto:hello@tradcopilot.com"
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <Mail size={13} />
              hello@tradcopilot.com
            </a>
          </div>
          <p className="text-[11px] text-[var(--muted)] max-w-2xl leading-relaxed">
            TradCopilot is a read-only analysis copilot. It does not execute trades, custody funds, or
            connect to your brokerage. Market data may be delayed or illustrative during feed outages.
            Nothing here is financial advice — trade your own plan.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
            <p className="text-xs text-[var(--muted)]">© {year} TradCopilot Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
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