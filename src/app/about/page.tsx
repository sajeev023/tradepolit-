import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cpu, Terminal, Sparkles, Lock, ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, ENTITY_DEFINITION } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About TradCopilot — Mission, Philosophy & Technical Architecture",
  description:
    "TradCopilot is a read-only AI trading copilot built on deterministic indicator calculations, multi-model AI validation, session journaling, and behavioral discipline.",
  path: "/about",
  keywords: [
    "about tradcopilot",
    "tradcopilot mission",
    "ai trading architecture",
    "read only trading tools",
    "deterministic technical analysis",
  ],
});

const BREADCRUMBS = [{ name: "About", path: "/about" }];

const PILLARS = [
  {
    icon: Cpu,
    title: "Deterministic Math Before AI",
    description:
      "Large language models should never guess indicator values or draw random levels. Server-side code calculates RSI, MACD, EMAs, ATR, and swing levels from live OHLCV feeds before any model receives the prompt.",
  },
  {
    icon: Sparkles,
    title: "Multi-Model Parallel Race",
    description:
      "We race Groq (Llama 3.3 70B & 3.1 8B), Google Gemini 2.0 Flash, NVIDIA NIM, and OpenAI GPT-4o-mini in parallel. The fastest valid, structured response wins, eliminating single-provider latency and downtime.",
  },
  {
    icon: Terminal,
    title: "Automated Consistency Gates",
    description:
      "Every generated setup must pass an internal validation gate (e.g. stop-loss side must match bias, reward-to-risk must clear ~1.5) before reaching the UI. Inconsistent outputs are rejected outright.",
  },
  {
    icon: Lock,
    title: "Strictly Read-Only & Non-Custodial",
    description:
      "TradCopilot cannot execute trades, hold custody of funds, or connect to your broker. You maintain complete sovereignty over your trading capital and order execution at all times.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS)]} />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono block pt-2">OUR MISSION &amp; ARCHITECTURE</span>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Built for traders who value <span className="tp-serif-italic">clarity over hype.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              {ENTITY_DEFINITION}
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Philosophy Section ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">01 · THE PROBLEM</span>
            <h2 className="tp-h2">Why we built TradCopilot</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                The retail trading software landscape is crowded with black-box &ldquo;magic signal&rdquo; bots that promise impossible win rates, or generic chat wrappers that hallucinate prices and give inconsistent advice.
              </p>
              <p className="tp-body">
                We believe retail day traders don&apos;t need an automated bot to gamble their capital. They need an institutional decision-support system: objective indicator measurements, structured technical thesis evaluation, situational memory of their own past trades, and behavioral guardrails that speak up when emotional fatigue sets in.
              </p>
            </div>
          </section>

          {/* ── Pillars Grid ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">02 · ARCHITECTURAL PILLARS</span>
            <h2 className="tp-h2">How the platform is engineered</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="tc-card space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] text-[var(--accent)]">
                        <Icon size={16} />
                      </div>
                      <h3 className="tp-h3 !text-[15px] font-semibold">{pillar.title}</h3>
                    </div>
                    <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Security & Integrity ── */}
          <section className="space-y-6">
            <span className="tp-eyebrow-mono block">03 · SECURITY &amp; PRIVACY</span>
            <h2 className="tp-h2">Non-custodial by design</h2>
            <div className="space-y-4 max-w-[65ch]">
              <p className="tp-body">
                Authentication is powered by Supabase, billing is handled securely through Stripe, and all personal trading journal logs belong strictly to the user. User data is never sold or used for public training.
              </p>
              <div className="tc-terminal p-4 sm:p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--accent)] font-mono font-semibold">
                  <ShieldCheck size={14} /> INFORMATIONAL &amp; EDUCATIONAL WORKSTATION
                </div>
                <p className="text-[var(--muted)] leading-relaxed">
                  TradCopilot is not a registered investment advisor or broker-dealer. We provide educational analysis and decision-support tools. All execution decisions and financial risk remain entirely with the trader.
                </p>
              </div>
            </div>
          </section>

          {/* ── Navigation Hub ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">LEARN MORE</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/features" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Features Overview <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Explore the workspace.</p>
              </Link>
              <Link href="/ai-chart-analysis" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  How AI Analysis Works <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Candle data to setup.</p>
              </Link>
              <Link href="/pricing" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Pricing &amp; Plans <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Free vs Pro.</p>
              </Link>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Experience the difference</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Start with 5 free daily analyses or explore the terminal in a 15-minute demo session.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Create Free Account
              </Link>
              <Link href="/faq" className="btn-secondary btn-lg">
                Read FAQ
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
