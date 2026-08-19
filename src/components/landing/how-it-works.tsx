import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    badge: "01 · Select",
    title: "Pick a pair",
    body: "Select any crypto or forex symbol from your watchlist. Live Binance & OANDA telemetry loads into the workspace — no chart setup, no indicator configuration.",
    punch: "Your effort: two clicks",
    tone: "green" as const,
  },
  {
    badge: "02 · Compile",
    title: "Get an AI-compiled setup",
    body: "RSI, MACD, EMA, support/resistance, and volume are assembled into a bias, entry, stop, and take-profit with a confidence grade — so you review the thesis before acting.",
    punch: "Your effort: one glance",
    tone: "green" as const,
  },
  {
    badge: "03 · Review",
    title: "Review with behavioral context",
    body: "The copilot surfaces revenge patterns, overtrading, and sizing notes pulled from your last 20 trades — so each decision is consistent with your own rules, not just the chart.",
    punch: "Your effort: trust the guardrail",
    tone: "green" as const,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-3 mb-14 sm:mb-16">
        <span className="tp-eyebrow-mono">01 — How it works</span>
        <h2 className="tp-h2">
          From chart to conviction in <span className="tc-accent-phrase">three steps</span>
        </h2>
        <p className="tp-body max-w-md mx-auto">
          No spreads to configure. No 50-tab setup. Just the answer you&apos;d ask a senior trader for.
        </p>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {steps.map((s, i) => (
          <Reveal key={i} delay={i * 70} className="tc-card h-full flex flex-col">
            <span className="tc-card__badge">{s.badge}</span>
            <h3 className="tc-card__title">{s.title}</h3>
            <p className="tc-card__body">{s.body}</p>

            {i === 1 && (
              <div className="my-2 p-2.5 rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-subtle)] space-y-1.5 select-none font-mono">
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="text-[var(--green)] font-semibold">BIAS BUY/LONG</span>
                  <span className="text-[9px] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] rounded px-1.5 py-0.5">
                    GRADE MEDIUM
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Entry</span>
                    <span className="text-[var(--ink)] font-semibold">$67,420</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Stop</span>
                    <span className="text-[var(--red)] font-semibold">$66,800</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Take-Profit</span>
                    <span className="text-[var(--green)] font-semibold">$68,900</span>
                  </div>
                </div>
              </div>
            )}

            <div className="tc-card__divider mt-auto" />
            <div className="flex items-center justify-between">
              <span className={`tc-card__punch tc-card__punch--${s.tone}`}>{s.punch}</span>
              <ArrowUpRight size={15} className="text-[var(--muted)]" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}