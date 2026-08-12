import Link from "next/link";
import { Suspense } from "react";
import {
  TrendingUp,
  ArrowRight,
  Check,
  Sparkles,
  Bell,
  Brain,
  BookOpen,
  BarChart3,
  MessageSquare,
  Mail,
  Lock,
  Radio,
  ShieldCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { StaggerChildren, StaggerChild } from "@/components/ui/animated-section";
import { StickyHeader } from "@/components/layout/sticky-header";
import { ElasticCard } from "@/components/ui/elastic-card";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { DesktopNavCTA, MobileGetStartedCTA } from "@/components/landing/navbar-ctas";
import { HeroCTA } from "@/components/landing/hero-cta";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Comparison } from "@/components/landing/comparison";
import { FounderStory } from "@/components/landing/founder-story";
import { ChapterHeader } from "@/components/landing/chapter-header";
import { NarrativeSpine } from "@/components/landing/narrative-spine";
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta";
import { LivePrice } from "@/components/landing/live-price";

const AntigravityCanvas = dynamic(
  () => import("@/components/ui/antigravity-canvas").then((m) => m.AntigravityCanvas)
);
const DesktopProductPreview = dynamic(
  () => import("@/components/landing/product-preview").then((m) => m.DesktopProductPreview)
);
const MobileProductPreview = dynamic(
  () => import("@/components/landing/product-preview").then((m) => m.MobileProductPreview)
);
const LiveTicker = dynamic(
  () => import("@/components/landing/live-ticker").then((m) => m.LiveTicker)
);
const MarketPulseBand = dynamic(
  () => import("@/components/landing/market-pulse-band").then((m) => m.MarketPulseBand)
);
const IntelligencePipeline = dynamic(
  () => import("@/components/landing/intelligence-pipeline").then((m) => m.IntelligencePipeline)
);

const features = [
  { icon: <Sparkles size={18} />, title: "Proactive AI Analysis", desc: "Charts auto-analyzed on selection. Indicators, bias, and levels loaded into the prompt pipeline instantly." },
  { icon: <Bell size={18} />, title: "Real-Time Alerts", desc: "Technical conditions checked every 20 seconds. Events generate instant notifications in your workspace." },
  { icon: <Brain size={18} />, title: "Behavioral Detection", desc: "Flags revenge trades, sizing errors, and overtrading before you deploy capital. Built-in discipline guardrails." },
  { icon: <BookOpen size={18} />, title: "Journal with Memory", desc: "Every trade logged to the database. The copilot reads history to provide context-calibrated coaching." },
  { icon: <BarChart3 size={18} />, title: "Performance Analytics", desc: "Win rate, P&L curves, session metrics, and RR ratios computed dynamically across your trading history." },
  { icon: <MessageSquare size={18} />, title: "Persistent Chat History", desc: "All conversations grouped by session. Context retrieval seamless across devices and restarts." },
];

const telemetry = [
  { icon: <Lock size={12} />, label: "Read-only", sub: "no broker access" },
  { icon: <Radio size={12} />, label: "Live Binance WS", sub: "real-time ticks" },
  { icon: <ShieldCheck size={12} />, label: "20-trade memory", sub: "behavioral context" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased overflow-x-hidden">
      <NarrativeSpine />

      {/* ━━━ NAVBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <StickyHeader className="sticky-header-shell">
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-10 select-none max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="TradCopilot Home">
            <div className="flex items-center justify-center rounded-md w-7 h-7" style={{ background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)", boxShadow: "0 4px 12px rgba(6,182,212,0.3)" }}>
              <TrendingUp size={14} color="#030712" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">TradCopilot</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Live BTC price chip — SSR-safe ("—" until WS connects) */}
            <span className="hidden xl:inline-flex items-center gap-1.5 mr-2 px-2.5 h-7 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] font-mono text-[11px] text-[var(--color-text-secondary)]">
              <span className="ping-dot" />
              <span className="text-[var(--color-text-quaternary)]">BTC</span>
              <LivePrice symbol="BTC/USD" sizeClass="text-[11px] text-[var(--color-text-primary)] tabular-nums" />
            </span>
            <a href="#features" className="btn-ghost text-[13px]">Features</a>
            <a href="#pricing" className="btn-ghost text-[13px]">Pricing</a>
            <DesktopNavCTA />
            <Link href="/login" className="btn-ghost text-[13px] px-3">Sign in</Link>
            <Link href="/signup" className="btn-primary text-[13px] ml-1 h-9 px-4">Get Started</Link>
          </nav>

          {/* Mobile: Sign In + Get Started + three-dot */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/login" className="h-10 px-3.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all">Sign In</Link>
            <MobileGetStartedCTA />
            <MobileMenu />
          </div>
        </div>
      </StickyHeader>

      {/* ━━━ HERO · CH.01 THE PREMISE ━━━━━━━━━━━━━━━━━━━━ */}
      <header id="top" className="hero-section relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 pt-24 pb-12 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Atmospheric background: perspective grid + particles + glow */}
        <div className="hero-grid" aria-hidden="true" />
        <div className="absolute inset-0 -top-12 pointer-events-none overflow-hidden z-0 opacity-30">
          <AntigravityCanvas particleCount={36} />
        </div>
        <div className="absolute inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(50% 40% at 70% 30%, rgba(6,182,212,0.10), transparent 70%)" }} aria-hidden="true" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            <div className="animate-enter chapter-chip">
              <span className="ping-dot" /> CH.01 · THE PREMISE
            </div>

            <h1 className="hero-headline animate-enter-delay-1 tp-display-lg text-[var(--color-text-primary)] glow-text">
              The AI copilot for{" "}
              <span className="gradient-text">disciplined traders.</span>
            </h1>

            <p className="hero-subtext animate-enter-delay-2 text-[14px] sm:text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[460px]">
              TradCopilot fuses real-time market data, charts, and an AI intelligence layer into one workspace — so every entry is prepared, reviewed, and consistent with your own rules.
            </p>

            <div className="hero-cta-row animate-enter-delay-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1 w-full">
              <HeroCTA />
            </div>

            {/* Telemetry ribbon — replaces the generic trust bar */}
            <div className="animate-enter-delay-4 telemetry-strip !h-auto !py-2.5 flex-wrap">
              {telemetry.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span style={{ color: "var(--color-accent-primary)" }}>{t.icon}</span>
                  <span className="text-[var(--color-text-secondary)] font-semibold">{t.label}</span>
                  <span className="tp-micro-label !text-[9px] hidden sm:inline">{t.sub}</span>
                  {i < telemetry.length - 1 && <span className="ts-sep ml-1.5 hidden sm:block" />}
                </div>
              ))}
            </div>

            {/* Mobile product preview */}
            <Suspense fallback={<div className="h-64" />}>
              <MobileProductPreview />
            </Suspense>
          </div>

          {/* Desktop living terminal — the money shot */}
          <Suspense fallback={<div className="h-[372px] lg:col-span-7 hidden lg:block" />}>
            <DesktopProductPreview />
          </Suspense>
        </div>
      </header>

      {/* ━━━ CH.02 THE PULSE — live market data ━━━━━━━━━━ */}
      <section id="pulse" className="relative scroll-mt-24">
        {/* Live ticker band */}
        <div className="hidden lg:block border-y border-[var(--color-border-default)] py-3 select-none" style={{ background: "var(--color-bg-secondary)" }}>
          <Suspense fallback={<div className="h-9" />}>
            <LiveTicker />
          </Suspense>
        </div>
        {/* Mobile live chips */}
        <div className="lg:hidden px-5 py-3 border-y border-[var(--color-border-default)]" style={{ background: "var(--color-bg-secondary)" }}>
          <Suspense fallback={<div className="h-9" />}>
            <LiveTicker />
          </Suspense>
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-14 lg:py-20">
          <ChapterHeader
            chapter="CH.02"
            eyebrow="THE PULSE"
            title="Markets, felt in real time."
            subtitle="Live telemetry streamed straight from Binance — prices, the Fear &amp; Greed index, and futures funding. Not cached bars, not screenshots."
          />
          <div className="mt-8">
            <Suspense fallback={<div className="h-32 skeleton rounded-xl" />}>
              <MarketPulseBand />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ━━━ CH.03 THE GAP — problem / solution ━━━━━━━━━━ */}
      <section id="gap" className="max-w-5xl mx-auto px-6 lg:px-10 py-20 lg:py-28" style={{ scrollMarginTop: "96px" }}>
        <ChapterHeader
          chapter="CH.03"
          eyebrow="THE GAP"
          align="center"
          title="Discipline is hard to hold alone."
          subtitle="Most trading tools stop at the chart. Decisions still depend on memory, context-switching, and self-restraint in the moment."
          className="mb-12 sm:mb-14"
        />
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <ElasticCard className="space-y-5 p-6">
            <h3 className="tp-micro-label">The typical workflow</h3>
            <ul className="space-y-3.5">
              {["Charts in one tab, AI in another, journal in a third", "Indicators re-explained on every new conversation", "Chart context resets when the tab closes", "Overtrading and revenge patterns tracked manually, if at all"].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-[var(--color-text-tertiary)]">
                  <span className="w-3.5 h-3.5 rounded-full border border-[var(--color-border-default)] mt-0.5 shrink-0" /><span>{text}</span>
                </li>
              ))}
            </ul>
          </ElasticCard>
          <ElasticCard className="space-y-5 p-6" style={{ borderColor: "rgba(6,182,212,0.18)", boxShadow: "var(--shadow-glow)" }}>
            <h3 className="tp-micro-label" style={{ color: "var(--color-accent-primary)" }}>With TradCopilot</h3>
            <ul className="space-y-3.5">
              {["Analysis, journal, and coaching in one workspace", "Persistent memory of your last 20 trades and patterns", "Chat threads logged and saved across all sessions", "Behavioral heuristics flag revenge trading inside the workspace"].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-[var(--color-text-primary)]">
                  <Check size={14} className="text-[var(--color-accent-primary)] shrink-0 mt-0.5" /><span>{text}</span>
                </li>
              ))}
            </ul>
          </ElasticCard>
        </div>
      </section>

      {/* ━━━ CH.04 THE ORIGIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FounderStory />

      {/* ━━━ CH.05 THE WORKSPACE — features + workflow ━━━━ */}
      <section id="workspace" className="max-w-6xl mx-auto px-6 lg:px-10 py-20 lg:py-28" style={{ scrollMarginTop: "96px" }}>
        <span id="features" aria-hidden="true" style={{ display: "block", height: 0, overflow: "hidden", scrollMarginTop: "96px" }} />
        <ChapterHeader
          chapter="CH.05"
          eyebrow="THE WORKSPACE"
          align="center"
          title="A complete terminal for trade preparation."
          subtitle="Analysis, journaling, and behavioral coaching — built to support consistent decision-making."
          className="mb-12 sm:mb-14"
        />
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f, i) => (
            <StaggerChild key={i}>
              <ElasticCard spotlight className="space-y-4 h-full p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-primary-subtle)", color: "var(--color-accent-primary)", border: "1px solid rgba(6,182,212,0.14)" }}>
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{f.title}</h3>
                <p className="text-[13px] text-[var(--color-text-tertiary)] leading-relaxed">{f.desc}</p>
              </ElasticCard>
            </StaggerChild>
          ))}
        </StaggerChildren>

        <div className="mt-20 lg:mt-28">
          <HowItWorks />
        </div>
      </section>

      {/* ━━━ CH.06 THE INTELLIGENCE — the wow ━━━━━━━━━━━━ */}
      <IntelligencePipeline />

      {/* ━━━ CH.07 THE DIFFERENCE ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Comparison />

      {/* ━━━ CH.08 THE COMMITMENT — pricing + FAQ + CTA ━━━ */}
      <section id="commitment" className="max-w-5xl mx-auto px-6 lg:px-10 py-20 lg:py-28 border-t border-[var(--color-border-subtle)] scroll-mt-20">
        <span id="pricing" aria-hidden="true" style={{ display: "block", height: 0, overflow: "hidden", scrollMarginTop: "96px" }} />
        <ChapterHeader
          chapter="CH.08"
          eyebrow="THE COMMITMENT"
          align="center"
          title="Start free. Upgrade when you&apos;re ready."
          subtitle="No credit card to start. Cancel anytime in one click."
          className="mb-12 sm:mb-14"
        />
        <div className="grid md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl mx-auto items-stretch">
          <ElasticCard className="pricing-free-card space-y-6 flex flex-col justify-between order-2 md:order-1 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Free</h3>
                <span className="badge badge-neutral">No card</span>
              </div>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-bold font-mono text-[var(--color-text-primary)]">$0</span><span className="text-xs text-[var(--color-text-tertiary)]">/ forever</span></div>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">For occasional traders who want a second opinion before entries.</p>
              <ul className="space-y-3 pt-2">
                {["5 AI chart analyses per day", "Standard response speed", "Last 20 trades in memory", "Behavioral coaching basics"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-[var(--color-text-primary)]"><Check size={14} className="text-[var(--color-accent-primary)] shrink-0" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <Link href="/signup" className="btn-secondary w-full h-11 text-xs font-semibold justify-center">Start Free — No Card</Link>
          </ElasticCard>
          <ElasticCard className="pricing-pro-card space-y-6 flex flex-col justify-between order-1 md:order-2 p-6" style={{ borderColor: "rgba(6,182,212,0.22)", boxShadow: "var(--shadow-glow-strong)" }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Pro Terminal</h3>
                <span className="badge badge-info">Most Popular</span>
              </div>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-bold font-mono tracking-tight text-[var(--color-text-primary)]">$7.49</span><span className="text-xs text-[var(--color-text-tertiary)]">/ month · cancel anytime</span></div>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">For active day traders who want unlimited scans and full behavioral enforcement.</p>
              <ul className="space-y-3 pt-2">
                {["Unlimited AI chart analyses", "Multi-model race pipeline (<3s)", "Persistent 20-trade memory & full journal context", "Real-time revenge & overtrading detection", "Weekly AI performance & risk reports"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-[var(--color-text-primary)]"><Check size={14} className="text-[var(--color-accent-primary)] shrink-0" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <Link href="/signup?plan=pro" className="btn-primary-lg w-full h-11 text-[13px]">Start 7-Day Pro Trial</Link>
          </ElasticCard>
        </div>
      </section>

      {/* ━━━ FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <div className="text-center space-y-3 mb-10">
          <span className="tp-eyebrow">FAQ</span>
          <h2 className="tp-display-sm text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        </div>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
      </section>

      {/* ━━━ FINAL CTA BAND ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-t border-[var(--color-border-default)] relative overflow-hidden" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(50% 80% at 50% 0%, rgba(6,182,212,0.12), transparent 70%)" }} aria-hidden="true" />
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-20 sm:py-24 text-center space-y-5 relative">
          <h2 className="tp-display-sm text-[var(--color-text-primary)] glow-text">
            Bring discipline to your next trade.
          </h2>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">
            Two free AI scans. No credit card required. No commitment — keep using your existing charting platform alongside it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/signup" className="group btn-primary-lg">
              <span>Start Free — No Card Required</span>
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="h-12 px-5 rounded-xl border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] text-[13px] font-semibold inline-flex items-center justify-center transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[var(--color-border-default)] py-10 sm:py-12" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="footer-inner max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-md w-6 h-6" style={{ background: "var(--color-accent-primary)" }}>
                <TrendingUp size={13} color="#030712" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">TradCopilot</span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] border border-[var(--color-border-default)] rounded px-1.5 py-0.5 ml-1">Read-only · No broker access</span>
            </div>
            <a href="mailto:hello@tradcopilot.com" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
              <Mail size={13} />
              hello@tradcopilot.com
            </a>
          </div>
          <p className="text-[11px] text-[var(--color-text-tertiary)] max-w-2xl leading-relaxed">
            TradCopilot is a read-only analysis copilot. It does not execute trades, custody funds, or connect to your brokerage. Nothing on this site is financial advice. Markets carry risk — trade your own plan.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
            <p className="text-xs text-[var(--color-text-tertiary)]">© 2026 TradCopilot Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-text-tertiary)]">
              <Link href="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">Privacy</Link>
              <Link href="/refund" className="hover:text-[var(--color-text-primary)] transition-colors">Refund</Link>
              <Link href="/disclaimer" className="hover:text-[var(--color-text-primary)] transition-colors">Disclaimer</Link>
              <Link href="/cookies" className="hover:text-[var(--color-text-primary)] transition-colors">Cookies</Link>
              <Link href="/acceptable-use" className="hover:text-[var(--color-text-primary)] transition-colors">Use Policy</Link>
              <Link href="/login" className="hover:text-[var(--color-text-primary)] transition-colors">App Login</Link>
            </div>
          </div>
        </div>
      </footer>

      <MobileStickyCta />
    </div>
  );
}