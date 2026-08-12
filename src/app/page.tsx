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
} from "lucide-react";
import dynamic from "next/dynamic";
import { StaggerChildren, StaggerChild } from "@/components/ui/animated-section";
import { StickyHeader } from "@/components/layout/sticky-header";
import { ElasticCard } from "@/components/ui/elastic-card";
import { SvgTracedLine } from "@/components/ui/svg-traced-line";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { MobileProductPreview } from "@/components/landing/product-preview";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { DesktopNavCTA, MobileGetStartedCTA } from "@/components/landing/navbar-ctas";
import { HeroCTA } from "@/components/landing/hero-cta";
import { TrustBar } from "@/components/landing/trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Comparison } from "@/components/landing/comparison";
import { FounderStory } from "@/components/landing/founder-story";

const AntigravityCanvas = dynamic(
  () => import("@/components/ui/antigravity-canvas").then((m) => m.AntigravityCanvas)
);
const DesktopProductPreview = dynamic(
  () => import("@/components/landing/product-preview").then((m) => m.DesktopProductPreview)
);
const InfiniteMarquee = dynamic(
  () => import("@/components/ui/infinite-marquee").then((m) => m.InfiniteMarquee)
);

const features = [
  { icon: <Sparkles size={18} />, title: "Proactive AI Analysis", desc: "Charts auto-analyzed on selection. Indicators, bias, and levels loaded into the prompt pipeline instantly." },
  { icon: <Bell size={18} />, title: "Real-Time Alerts", desc: "Technical conditions checked every 20 seconds. Events generate instant notifications in your workspace." },
  { icon: <Brain size={18} />, title: "Behavioral Detection", desc: "Flags revenge trades, sizing errors, and overtrading before you deploy capital. Built-in discipline guardrails." },
  { icon: <BookOpen size={18} />, title: "Journal with Memory", desc: "Every trade logged to the database. The copilot reads history to provide context-calibrated coaching." },
  { icon: <BarChart3 size={18} />, title: "Performance Analytics", desc: "Win rate, P&L curves, session metrics, and RR ratios computed dynamically across your trading history." },
  { icon: <MessageSquare size={18} />, title: "Persistent Chat History", desc: "All conversations grouped by session. Context retrieval seamless across devices and restarts." },
];

const marqueeItems = [
  { symbol: "BTC/USD", price: "$92,450.50", change: "+1.85%" },
  { symbol: "ETH/USD", price: "$3,420.10", change: "+2.40%" },
  { symbol: "SOL/USD", price: "$194.80", change: "+4.12%" },
  { symbol: "EUR/USD", price: "1.0845", change: "-0.12%" },
  { symbol: "GBP/USD", price: "1.2650", change: "+0.35%" },
  { symbol: "NASDAQ", price: "18,450.20", change: "+0.95%" },
  { symbol: "S&P 500", price: "$5,420.80", change: "+0.65%" },
];

const assetChips = [
  { sym: "BTC", price: 62733, change: 0.4 },
  { sym: "ETH", price: 1787, change: 0.3 },
  { sym: "SOL", price: 174, change: -1.2 },
  { sym: "EUR/USD", price: 1.0845, change: -0.12 },
  { sym: "GBP/USD", price: 1.265, change: 0.35 },
  { sym: "NASDAQ", price: 18450, change: 0.95 },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased overflow-x-hidden">
      {/* ━━━ NAVBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <StickyHeader className="sticky-header-shell">
        <div className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-10 select-none max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="TradCopilot Home">
            <div className="flex items-center justify-center rounded-md w-7 h-7" style={{ background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)", boxShadow: "0 4px 12px rgba(6,182,212,0.3)" }}>
              <TrendingUp size={14} color="#09090B" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">TradCopilot</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
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

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="hero-section relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 pt-20 pb-12 sm:pt-28 sm:pb-20 lg:pt-36 lg:pb-28 grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
        <div className="absolute inset-0 -top-12 pointer-events-none overflow-hidden z-0 opacity-40">
          <AntigravityCanvas particleCount={50} />
        </div>

        <div className="lg:col-span-5 space-y-4 sm:space-y-6 animate-enter relative z-10">
          <div className="animate-enter inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-accent-primary-subtle)] backdrop-blur-md text-[11px] font-semibold tracking-wide select-none" style={{ color: "var(--color-accent-primary)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-accent-primary)" }} />
            For active crypto &amp; forex day traders
          </div>

          <h1 className="hero-headline animate-enter-delay-1 tp-display-lg text-[var(--color-text-primary)]">
            The AI copilot for{" "}
            <span className="gradient-text">
              disciplined traders.
            </span>
          </h1>

          <p className="hero-subtext animate-enter-delay-2 text-[14px] sm:text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[460px]">
            TradCopilot brings real-time chart analysis, a persistent trade journal, and behavioral coaching into one workspace — so every entry is prepared, reviewed, and consistent with your own rules.
          </p>

          {/* CTA row */}
          <div className="hero-cta-row animate-enter-delay-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1 w-full">
            <HeroCTA />
          </div>

          {/* Mobile product preview */}
          <Suspense fallback={<div className="h-64" />}>
            <MobileProductPreview />
          </Suspense>
        </div>

        {/* Desktop product mockup */}
        <Suspense fallback={<div className="h-[360px]" />}>
          <DesktopProductPreview />
        </Suspense>
      </header>

      {/* ━━━ TRUST BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <TrustBar />

      {/* ━━━ MOBILE ASSET CHIPS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="block lg:hidden px-5 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-5 px-5"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {assetChips.map((a, i) => (
            <div key={i} className="flex-none snap-start flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/80 min-w-0">
              <span className="text-[11px] font-semibold font-mono text-[var(--color-text-primary)] whitespace-nowrap">{a.sym}</span>
              <span className="text-[10px] font-mono text-[var(--color-text-secondary)] tabular-nums whitespace-nowrap">
                ${a.price >= 1000 ? a.price.toLocaleString() : a.price.toFixed(4)}
              </span>
              <span className={`text-[10px] font-mono font-medium whitespace-nowrap ${a.change >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                {a.change >= 0 ? "+" : ""}{a.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ DESKTOP TICKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="hidden lg:block border-y border-[var(--color-border-default)] py-3 select-none" style={{ background: "var(--color-bg-secondary)" }}>
        <InfiniteMarquee direction="left">
          {marqueeItems.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-3 border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-1 rounded-full text-xs font-semibold font-mono text-[var(--color-text-primary)]">
              <span>{pair.symbol}</span>
              <span className="text-[var(--color-text-tertiary)] font-normal">{pair.price}</span>
              <span className={pair.change.startsWith("+") ? "text-[var(--color-profit)] font-medium" : "text-[var(--color-loss)] font-medium"}>{pair.change}</span>
            </div>
          ))}
        </InfiniteMarquee>
      </section>

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ PROBLEM / SOLUTION ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-4xl mx-auto px-6 lg:px-10 py-20 lg:py-32">
        <div className="text-center space-y-3 mb-14 sm:mb-16 animate-enter">
          <span className="tp-eyebrow">The Workflow Gap</span>
          <h2 className="tp-display text-[var(--color-text-primary)]">Discipline is hard to hold alone</h2>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">Most trading tools stop at the chart. Decisions still depend on memory, context-switching, and self-restraint in the moment.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 animate-enter-delay-1">
          <ElasticCard className="space-y-5">
            <h3 className="text-[12px] font-semibold font-mono text-[var(--color-text-tertiary)] tracking-wider uppercase">The Typical Workflow</h3>
            <ul className="space-y-3.5">
              {["Charts in one tab, AI in another, journal in a third", "Indicators re-explained on every new conversation", "Chart context resets when the tab closes", "Overtrading and revenge patterns tracked manually, if at all"].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-[var(--color-text-tertiary)]">
                  <span className="w-3.5 h-3.5 rounded-full border border-[var(--color-border-default)] mt-0.5 shrink-0" /><span>{text}</span>
                </li>
              ))}
            </ul>
          </ElasticCard>
          <ElasticCard className="space-y-5">
            <h3 className="text-[12px] font-semibold font-mono text-[var(--color-text-primary)] tracking-wider uppercase">With TradCopilot</h3>
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

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ WHY WE BUILT TRADCOPILOT ━━━━━━━━━━━━━━━━━━ */}
      <FounderStory />

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" className="max-w-6xl mx-auto px-6 lg:px-10 py-20 lg:py-32">
        <div className="text-center space-y-3 mb-14 sm:mb-16 animate-enter">
          <span className="tp-eyebrow">Features</span>
          <h2 className="tp-display text-[var(--color-text-primary)]">A complete workspace for trade preparation</h2>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">Analysis, journaling, and behavioral coaching — built to support consistent decision-making.</p>
        </div>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f, i) => (
            <StaggerChild key={i}>
              <ElasticCard className="space-y-4 h-full">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-primary-subtle)", color: "var(--color-accent-primary)", border: "1px solid rgba(6,182,212,0.12)" }}>
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{f.title}</h3>
                <p className="text-[13px] text-[var(--color-text-tertiary)] leading-relaxed">{f.desc}</p>
              </ElasticCard>
            </StaggerChild>
          ))}
        </StaggerChildren>
      </section>

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <HowItWorks />

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ COMPARISON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Comparison />

      {/* ━━━ PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 lg:px-10 py-20 lg:py-28 border-t border-[var(--color-border-subtle)] scroll-mt-12">
        <div className="text-center space-y-3 mb-14 sm:mb-16 animate-enter">
          <span className="tp-eyebrow">Pricing</span>
          <h2 className="tp-display text-[var(--color-text-primary)]">Start free. Upgrade when you&apos;re ready.</h2>
          <p className="text-[14px] text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">No credit card to start. Cancel anytime in one click.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl mx-auto items-stretch">
          <ElasticCard className="pricing-free-card space-y-6 flex flex-col justify-between order-2 md:order-1">
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
          <ElasticCard className="pricing-pro-card space-y-6 flex flex-col justify-between order-1 md:order-2" style={{ borderColor: "rgba(6,182,212,0.2)", boxShadow: "var(--shadow-glow)" }}>
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
            <Link href="/signup?plan=pro" className="btn-primary w-full h-11 text-xs font-semibold justify-center">Start 7-Day Pro Trial</Link>
          </ElasticCard>
        </div>
      </section>

      {/* ━━━ FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-20 lg:py-28 border-t border-[var(--color-border-subtle)]">
        <div className="text-center space-y-3 mb-12 animate-enter">
          <span className="tp-eyebrow">FAQ</span>
          <h2 className="tp-display text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        </div>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
      </section>

      {/* ━━━ FINAL CTA BAND ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-t border-[var(--color-border-default)]" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-16 sm:py-20 text-center space-y-5">
          <h2 className="tp-display-sm text-[var(--color-text-primary)]">
            Bring discipline to your next trade.
          </h2>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">
            Two free AI scans. No credit card required. No commitment — keep using your existing charting platform alongside it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="group h-11 px-6 rounded-xl bg-[var(--color-text-primary)] hover:opacity-90 text-[var(--color-bg-primary)] text-[13px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/30 active:scale-[0.98] transition-all duration-150"
            >
              <span>Start Free — No Card Required</span>
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="h-11 px-5 rounded-xl border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] text-[13px] font-semibold inline-flex items-center justify-center transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[var(--color-border-default)] py-10 sm:py-12" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="footer-inner max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center rounded-md w-6 h-6" style={{ background: "var(--color-accent-primary)" }}>
                <TrendingUp size={13} color="#09090B" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">TradCopilot</span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] border border-[var(--color-border-default)] rounded px-1.5 py-0.5 ml-1">Read-only · No broker access</span>
            </div>
            <a
              href="mailto:hello@tradcopilot.com"
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
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
    </div>
  );
}
