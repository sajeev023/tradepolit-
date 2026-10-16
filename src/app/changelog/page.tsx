import Link from "next/link";
import { ArrowLeft, Zap, Shield, Cpu, Activity } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Changelog — Shipped Updates",
  description:
    "Every shipped TradCopilot update: live market data feeds, the multi-model AI analysis engine, behavioral guardrails, journal memory architecture, and read-only safety design.",
  path: "/changelog",
});

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
      "Launched multi-model race pipeline (Groq, NVIDIA NIM, Gemini fallback) — models run in parallel and the first valid chart thesis wins.",
      "Built deterministic trade validation engine to flag RSI, MACD, and price level contradictions before output compilation.",
      "Implemented behavioral guardrails that flag revenge-style re-entries and overtrading against your last 20 logged trades.",
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
      "Alert engine covering price levels, RSI thresholds, EMA crossovers, and trend-change checks with scheduled daily evaluation.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <JsonLd data={[breadcrumbJsonLd([{ name: "Changelog", path: "/changelog" }])]} />

      <main className="max-w-[840px] mx-auto px-4 sm:px-6 pt-20 sm:pt-28 lg:pt-32 pb-12 sm:pb-20">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-4 sm:mb-6"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="space-y-2 sm:space-y-3">
            <span className="tp-eyebrow-mono">Product Updates</span>
            <h1 className="tp-display-xl !text-2xl sm:!text-3xl lg:!text-4xl">Changelog</h1>
            <p className="tp-body max-w-xl text-[13px] sm:text-[14px]">
              Real shipped updates and verifiable improvements to TradCopilot. We ship weekly to improve analysis speed, guardrail precision, and memory capabilities.
            </p>
          </div>
        </div>

        <hr className="border-[var(--color-border-subtle)] my-6 sm:my-10" />

        <div className="space-y-6 sm:space-y-10 lg:space-y-12">
          {updates.map((up) => (
            <section
              key={up.version}
              id={up.version}
              className="relative pl-0 sm:pl-8 sm:border-l sm:border-[var(--color-border-subtle)] space-y-3 sm:space-y-4 scroll-mt-24"
            >
              {/* Desktop timeline marker */}
              <div className="hidden sm:flex absolute -left-[13px] top-1.5 w-6 h-6 rounded-full bg-[var(--bg-band)] border border-[var(--color-border-strong)] items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="text-xs font-mono text-[var(--muted)]">{up.date}</span>
                <span className="text-xs font-mono text-[var(--muted)]">·</span>
                <a
                  href={`#${up.version}`}
                  className="text-xs font-mono font-semibold text-[var(--accent)] hover:underline"
                  aria-label={`Permalink to ${up.version}`}
                >
                  {up.version}
                </a>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[rgba(var(--accent-rgb),0.1)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.25)]">
                  {up.badge}
                </span>
              </div>

              <div className="tc-card p-3.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center shrink-0">
                    {up.icon}
                  </div>
                  <h2 className="text-[15px] sm:text-[17px] font-bold text-[var(--ink)] tracking-tight">
                    {up.title}
                  </h2>
                </div>

                <ul className="space-y-2 text-[12px] sm:text-[13px] text-[var(--muted)] leading-relaxed">
                  {up.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
