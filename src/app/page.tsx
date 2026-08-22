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
      <header className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-[80px] sm:pt-[130px] lg:pt-[160px] pb-8 sm:pb-14 lg:pb-20">
        {/* Editorial masthead — a publication-style dateline carrying one live
            datum (BTC, public Binance WS). Replaces the generic "who's it for"
            status chip with something that reads as a real desk. */}
        <div className="tp-masthead mb-5 sm:mb-8 lg:mb-12">
          <span>Vol. 01</span>
          <span className="tp-masthead__sep" />
          <span>The Trader&apos;s Copilot</span>
          <span className="tp-masthead__sep" />
          <Suspense
            fallback={
              <span className="tp-masthead__live inline-flex items-center gap-1.5">
                BTC · live
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_6px_rgba(var(--accent-rgb),0.6)]"
                  style={{ animationDuration: "1.2s" }}
                />
              </span>
            }
          >
            <MastheadPrice />
          </Suspense>
          <span className="tp-masthead__sep" />
          <span>For active crypto &amp; forex day traders</span>
        </div>

        {/* Headline block — serif voice, left-aligned, room to breathe.
            The italic accent word replaces the old cyan gradient phrase:
            emphasis comes from the serif italic, not from color. The blur
            reveal is the page's one signature motion moment. */}
        <Reveal blur className="max-w-[920px] space-y-4 sm:space-y-6">
          <h1 className="tp-display-xl">
            Execute your trading plan with <span className="tp-serif-italic">institutional discipline.</span>
          </h1>

          <p className="tp-body max-w-[560px]">
            Real-time chart telemetry, persistent session trade journaling, and automated risk guardrails in one focused workspace.
          </p>

          <div className="pt-1">
            <HeroCTA />
          </div>
        </Reveal>

        {/* Live-data workbench — full-width "live desk" below the masthead.
            REAL candles, indicators, WS price; no fabricated AI. A subtle,
            scroll-scrubbed parallax (GSAP ScrollTrigger, reduced-motion off)
            gives the live desk a sense of depth as it passes the viewport. */}
        <div className="mt-6 sm:mt-10 lg:mt-12">
          <Suspense fallback={<div className="h-[320px] sm:h-[420px] tc-skeleton rounded-2xl" />}>
            <ScrollParallax distance={14}>
              <HeroWorkbench />
            </ScrollParallax>
          </Suspense>
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
          <span className="tp-eyebrow-mono">05 / QUESTIONS</span>
          <h2 className="tp-h2">
            Frequently asked questions about the terminal
          </h2>
        </Reveal>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
      </section>

      {/* ━━━ 10 · FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FinalCta />

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[var(--color-border-subtle)] py-8 sm:py-10 lg:py-12 bg-[var(--bg-band)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10 space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
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

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] text-[var(--muted)]">
              <a
                href="https://x.com/tradcopilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
                aria-label="TradCopilot on X"
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
                aria-label="TradCopilot on LinkedIn"
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
            Read-only analytical terminal. Does not execute trades, hold funds, or connect to your brokerage.
            Analytical workstation for educational and discipline purposes only.
          </p>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
            <p className="text-[11px] sm:text-xs text-[var(--muted)]">© {year} TradCopilot Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-[11px] sm:text-xs text-[var(--muted)]">
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