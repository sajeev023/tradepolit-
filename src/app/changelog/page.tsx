import Link from "next/link";
import { ArrowLeft, TrendingUp, Zap, Shield, Cpu, Activity } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";

const updates = [
  {
    date: "August 15, 2026",
    version: "v1.4.0",
    title: "Real-Time Live Desk & Single-Accent Precision",
    badge: "LATEST",
    icon: <Activity size={16} className="text-[var(--accent)]" />,
    items: [
      "Integrated centralized public Binance WebSocket feeds for real-time live BTC, ETH, SOL, and EUR ticks with zero auth requirement.",
      "Unified single-accent design system (#2FC6E8) across all terminal, dashboard, and marketing surfaces.",
      "Eliminated all dash placeholders during first-render hydration states; implemented composed skeleton loaders matching real card geometry.",
      "Introduced live editorial masthead with pulsing status telemetry and active feed monitors.",
    ],
  },
  {
    date: "August 10, 2026",
    version: "v1.3.0",
    title: "Multi-Model AI Engine & Behavioral Guardrails",
    badge: "CORE ENGINE",
    icon: <Cpu size={16} className="text-[var(--accent)]" />,
    items: [
      "Launched multi-model race pipeline (Groq, NVIDIA NIM, Gemini fallback) delivering comprehensive chart theses in under 3 seconds.",
      "Built deterministic trade validation engine to flag RSI, MACD, and price level contradictions before output compilation.",
      "Implemented real-time behavioral guardrail engine tracking revenge trades, rapid re-entries, and sizing spikes based on your last 20 trades.",
      "Added inline thesis previews and structured setup recommendations (Bias, Entry, Stop, Take-Profit).",
    ],
  },
  {
    date: "August 05, 2026",
    version: "v1.2.0",
    title: "Persistent Trade Journal & Memory Architecture",
    badge: "WORKSPACES",
    icon: <Zap size={16} className="text-[var(--accent)]" />,
    items: [
      "Released persistent trade journal with automatic session memory across chart sessions.",
      "Added emotional state logging and discipline tracking to measure trade rule compliance over time.",
      "Built weekly AI performance synthesis and risk expectancy calculator.",
      "Enabled saved analysis bookmarks with full technical context snapshots.",
    ],
  },
  {
    date: "July 28, 2026",
    version: "v1.0.0",
    title: "Read-Only Analysis Architecture",
    badge: "FOUNDATION",
    icon: <Shield size={16} className="text-[var(--accent)]" />,
    items: [
      "Established foundational read-only architecture: zero broker credentials, zero fund custody, zero execution risk.",
      "Public OHLCV candle streams and technical indicator math library (RSI, MACD, EMA 9/21, ATR, Key Levels).",
      "Interactive TradingView charting integration with high-contrast dark theme.",
      "Sub-20s alert check cadence for key support and resistance structural breaks.",
    ],
  },
];

export default function ChangelogPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="max-w-[840px] mx-auto px-5 sm:px-6 pt-32 pb-24">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="space-y-3">
            <span className="tp-eyebrow-mono">Product Updates</span>
            <h1 className="tp-display-xl !text-3xl sm:!text-4xl">Changelog</h1>
            <p className="tp-body max-w-xl text-[14px]">
              Real shipped updates and verifiable improvements to TradCopilot. We ship weekly to improve analysis speed, guardrail precision, and memory capabilities.
            </p>
          </div>
        </div>

        <hr className="border-[var(--color-border-subtle)] my-10" />

        <div className="space-y-12">
          {updates.map((up, idx) => (
            <section
              key={up.version}
              className="relative pl-0 sm:pl-8 sm:border-l sm:border-[var(--color-border-subtle)] space-y-4"
            >
              {/* Desktop timeline marker */}
              <div className="hidden sm:flex absolute -left-[13px] top-1.5 w-6 h-6 rounded-full bg-[var(--bg-band)] border border-[var(--color-border-strong)] items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-mono text-[var(--muted)]">{up.date}</span>
                <span className="text-xs font-mono text-[var(--muted)]">·</span>
                <span className="text-xs font-mono font-semibold text-[var(--ink)]">{up.version}</span>
                <span className="text-[10px] font-mono text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] rounded px-1.5 py-0.5">
                  {up.badge}
                </span>
              </div>

              <div className="tc-card !p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  {up.icon}
                  <h2 className="text-[17px] font-semibold text-[var(--ink)]">{up.title}</h2>
                </div>

                <ul className="space-y-2.5">
                  {up.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--muted)] leading-relaxed">
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--color-border-subtle)] py-8 bg-[var(--bg-band)]">
        <div className="max-w-[840px] mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <p>© {year} TradCopilot Inc. Read-only analysis copilot.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[var(--ink)] transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
