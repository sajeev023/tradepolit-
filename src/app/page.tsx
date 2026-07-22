import Link from "next/link";
import { Suspense } from "react";
import {
  TrendingUp,
  ArrowRight,
  Check,
  X,
  Sparkles,
  Bell,
  Brain,
  BookOpen,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import dynamic from "next/dynamic";
import { StickyHeader } from "@/components/layout/sticky-header";
import { ElasticCard } from "@/components/ui/elastic-card";
import { SvgTracedLine } from "@/components/ui/svg-traced-line";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { MobileProductPreview } from "@/components/landing/product-preview";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { AnimatedSection } from "@/components/landing/scroll-animator";
import { DesktopNavCTA } from "@/components/landing/navbar-ctas";
import { HeroCTA } from "@/components/landing/hero-cta";

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
  { icon: <Brain size={18} />, title: "Behavioral Detection", desc: "Flags revenge trades, sizing errors, and overtrading before you deploy capital. Built-in discipline enforcement." },
  { icon: <BookOpen size={18} />, title: "Journal with Memory", desc: "Every trade logged to the database. The copilot reads history to provide context-calibrated coaching." },
  { icon: <BarChart3 size={18} />, title: "Performance Analytics", desc: "Win rate, P&L curves, session metrics, and RR ratios computed dynamically across your trading history." },
  { icon: <MessageSquare size={18} />, title: "Persistent Chat History", desc: "All conversations grouped by session. Context retrieval seamless across devices and restarts." },
];

const productCapabilities = [
  { label: "Built for crypto & forex", sub: "Real-time market data" },
  { label: "AI-powered analysis", sub: "Multi-model pipeline" },
  { label: "Risk-first workflow", sub: "Built-in position sizing" },
  { label: "Behavior-aware journal", sub: "Pattern recognition" },
];

const marqueeItems = [
  { symbol: "BTC/USD", price: "$92,450.50", change: "+1.85%" },
  { symbol: "ETH/USD", price: "$3,420.10", change: "+2.40%" },
  { symbol: "SOL/USD", price: "$194.80", change: "+4.12%" },
  { symbol: "EUR/USD", price: "1.0845", change: "-0.12%" },
  { symbol: "GBP/USD", price: "1.2650", change: "+0.35%" },
  { symbol: "NASDAQ", price: "18,450.20", change: "+0.95%" },
  { symbol: "S&P 500", price: "5,420.80", change: "+0.65%" },
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
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="TradePilot Home">
            <div className="flex items-center justify-center rounded-md w-7 h-7 shadow-lg shadow-emerald-500/20" style={{ background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)" }}>
              <TrendingUp size={14} color="#09090B" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">TradePilot</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="#features" className="btn-ghost text-[13px]">Features</a>
            <a href="#pricing" className="btn-ghost text-[13px]">Pricing</a>
            <DesktopNavCTA />
            <Link href="/login" className="btn-ghost text-[13px] px-3">Sign in</Link>
            <Link href="/signup" className="btn-primary text-[13px] ml-1 shadow-md shadow-emerald-500/10 h-9 px-4">Get Started</Link>
          </nav>

          {/* Mobile: Sign In + three-dot */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/login" className="h-10 px-3.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all">Sign In</Link>
            <MobileMenu />
          </div>
        </div>
      </StickyHeader>

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="hero-section relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 pt-20 pb-12 sm:pt-28 sm:pb-20 lg:pt-36 lg:pb-28 grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
        <div className="absolute inset-0 -top-12 pointer-events-none overflow-hidden z-0">
          <AntigravityCanvas particleCount={140} />
        </div>

        <div className="lg:col-span-5 space-y-4 sm:space-y-6 animate-enter relative z-10">
          <div className="animate-enter inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-md text-[11px] text-[var(--color-text-tertiary)] font-medium tracking-wide select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
            AI Trading Copilot · Early Access
          </div>

          <h1 className="hero-headline animate-enter-delay-1 leading-[1.08] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
            <span className="sm:hidden">The AI copilot that trades<br />with </span>
            <span className="hidden sm:inline">The AI copilot that trades with </span>
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">your discipline.</span>
          </h1>

          <p className="hero-subtext animate-enter-delay-2 text-[14px] sm:text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[440px]">
            TradePilot reads your charts, remembers every session, tracks behavioral patterns, and coaches you past emotional mistakes.
          </p>

          {/* CTA row */}
          <div className="hero-cta-row animate-enter-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full">
            <HeroCTA />
            <a href="#pricing" className="group text-[14px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center sm:justify-start gap-1.5 min-h-[44px] cursor-pointer">
              See how it works <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          <p className="animate-enter-delay-4 text-[12px] text-[var(--color-text-quaternary)] select-none pt-1">
            Free to start · 5 free analyses per day · No credit card required
          </p>

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

      {/* ━━━ MOBILE ASSET CHIPS ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="block lg:hidden px-5 pb-4">
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
      <section className="hidden lg:block bg-card border-y border-border py-3 text-foreground shadow-sm select-none">
        <InfiniteMarquee direction="left">
          {marqueeItems.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-3 border border-border bg-background px-3 py-1 rounded-full text-xs font-semibold text-foreground font-mono">
              <span>{pair.symbol}</span>
              <span className="text-muted-foreground font-normal">{pair.price}</span>
              <span className={pair.change.startsWith("+") ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>{pair.change}</span>
            </div>
          ))}
        </InfiniteMarquee>
      </section>

      {/* ━━━ PRODUCT CAPABILITIES ━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {productCapabilities.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</div>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ PROBLEM / SOLUTION ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-4xl mx-auto px-6 lg:px-10 py-20 lg:py-32">
        <AnimatedSection className="text-center space-y-3 mb-14 sm:mb-16">
          <span className="section-eyebrow">The Problem</span>
          <h2 className="text-[26px] sm:text-[36px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">Why Most Traders Lose Money</h2>
          <p className="text-[14px] text-zinc-400 max-w-md mx-auto leading-relaxed">Trading success is constrained by memory, structure, and emotional guardrails.</p>
        </AnimatedSection>
        <AnimatedSection className="grid md:grid-cols-2 gap-5 sm:gap-6" delay={200}>
          <ElasticCard className="space-y-5 bg-card text-card-foreground border border-border shadow-sm rounded-2xl">
            <h3 className="text-[12px] font-semibold font-mono text-muted-foreground tracking-wider uppercase">Without a Copilot</h3>
            <ul className="space-y-3.5">
              {["Screenshots uploaded to general ChatGPT sessions", "Re-explaining indicators on every new conversation", "AI forgets chart history when the tab closes", "No tracking of overtrading or revenge patterns"].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-muted-foreground">
                  <X size={14} className="text-muted-foreground shrink-0 mt-0.5" /><span>{text}</span>
                </li>
              ))}
            </ul>
          </ElasticCard>
          <ElasticCard className="space-y-5 bg-card text-card-foreground border border-border shadow-sm rounded-2xl">
            <h3 className="text-[12px] font-semibold font-mono text-foreground tracking-wider uppercase">With TradePilot</h3>
            <ul className="space-y-3.5">
              {["Instant scans compiled from your watchlist selections", "Persistent memory of your last 20 trades and patterns", "Chat threads logged and saved across all sessions", "Heuristics flag revenge trading inside the workspace"].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-foreground">
                  <Check size={14} className="text-foreground shrink-0 mt-0.5" /><span>{text}</span>
                </li>
              ))}
            </ul>
          </ElasticCard>
        </AnimatedSection>
      </section>

      <SvgTracedLine color="rgba(148, 163, 184, 0.25)" />

      {/* ━━━ FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" className="max-w-6xl mx-auto px-6 lg:px-10 py-20 lg:py-32">
        <AnimatedSection className="text-center space-y-3 mb-14 sm:mb-16">
          <span className="section-eyebrow">Features</span>
          <h2 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-white">Everything You Need to Trade Smarter</h2>
          <p className="text-[14px] text-zinc-400 max-w-md mx-auto leading-relaxed">A calibrated suite of indicators, analytics, and persistent AI memory.</p>
        </AnimatedSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f, i) => (
            <ElasticCard key={i} className="space-y-4 bg-card text-card-foreground border border-border shadow-sm rounded-2xl hover:border-accent/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-foreground">{f.icon}</div>
              <h3 className="text-[15px] font-semibold text-foreground">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </ElasticCard>
          ))}
        </div>
      </section>

      {/* ━━━ PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 lg:px-10 py-20 lg:py-28 border-t border-border scroll-mt-12">
        <AnimatedSection className="text-center space-y-3 mb-14 sm:mb-16">
          <span className="section-eyebrow">Pricing</span>
          <h2 className="text-[26px] sm:text-[36px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">Simple, Transparent Pricing</h2>
          <p className="text-[14px] text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">Start free. Upgrade when you need unlimited power.</p>
        </AnimatedSection>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl mx-auto items-stretch">
          <ElasticCard className="pricing-free-card space-y-6 flex flex-col justify-between bg-card text-card-foreground border border-border shadow-sm rounded-2xl order-2 md:order-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Free Plan</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground font-medium">Starter</span>
              </div>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-bold font-mono text-foreground">$0</span><span className="text-xs text-muted-foreground">/ forever</span></div>
              <p className="text-xs text-muted-foreground leading-relaxed">Essential copilot capabilities for occasional traders.</p>
              <ul className="space-y-3 pt-2">
                {["5 AI chart analyses per day", "Standard response speed", "Last 5 trades in memory", "Basic psychology coaching"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-foreground"><Check size={14} className="text-accent shrink-0" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <Link href="/signup" className="btn-secondary w-full h-11 text-xs font-semibold justify-center">Start Free</Link>
          </ElasticCard>
          <ElasticCard className="pricing-pro-card space-y-6 flex flex-col justify-between bg-card text-card-foreground border border-accent/20 shadow-md rounded-2xl order-1 md:order-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Pro Terminal</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono font-semibold">Most Popular</span>
              </div>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-bold font-mono tracking-tight text-foreground">$7.49</span><span className="text-xs text-muted-foreground">/ month</span></div>
              <p className="text-xs text-muted-foreground leading-relaxed">Unlimited institutional analysis and behavioral risk shield.</p>
              <ul className="space-y-3 pt-2">
                {["Unlimited AI chart analyses", "Fastest multi-model race pipeline (<3s)", "Persistent 20-trade memory & full journal context", "Real-time revenge & overtrading detection", "Weekly AI performance & risk reports"].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-foreground"><Check size={14} className="text-accent shrink-0" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <Link href="/signup?plan=pro" className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs flex items-center justify-center transition-colors duration-200 shadow-md">Upgrade to Pro Terminal</Link>
          </ElasticCard>
        </div>
      </section>

      {/* ━━━ FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-20 lg:py-28 border-t border-[var(--color-border-subtle)]">
        <div className="text-center space-y-3 mb-12">
          <span className="section-eyebrow">FAQ</span>
          <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">Frequently Asked Questions</h2>
        </div>
        <Suspense fallback={<div className="h-64" />}>
          <FaqAccordion />
        </Suspense>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-border py-10 sm:py-12 bg-card/85 backdrop-blur-md">
        <div className="footer-inner max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-md w-6 h-6 bg-emerald-500">
              <TrendingUp size={13} color="#09090B" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">TradePilot</span>
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-left">© 2026 TradePilot Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">Refund</Link>
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link href="/acceptable-use" className="hover:text-foreground transition-colors">Use Policy</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">App Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
