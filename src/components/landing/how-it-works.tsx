import { MousePointerClick, Sparkles, ShieldCheck } from "lucide-react";
import { AnimatedSection } from "./scroll-animator";
import { StaggerChildren, StaggerChild } from "@/components/ui/animated-section";

const steps = [
  {
    n: "01",
    icon: <MousePointerClick size={16} />,
    title: "Pick a pair",
    body: "Select any crypto or forex symbol from your watchlist. Live Binance and OANDA telemetry loads into the workspace — no chart setup, no indicator configuration.",
  },
  {
    n: "02",
    icon: <Sparkles size={16} />,
    title: "Get an AI-compiled setup",
    body: "TradCopilot assembles RSI, MACD, EMA, support/resistance, and volume into a bias, entry, stop, and take-profit with a confidence grade — so you can review the thesis before acting.",
  },
  {
    n: "03",
    icon: <ShieldCheck size={16} />,
    title: "Review with behavioral context",
    body: "The copilot surfaces revenge patterns, overtrading, and sizing notes pulled from your last 20 trades — so each decision is consistent with your own rules, not just the chart.",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <AnimatedSection className="text-center space-y-3 mb-14 sm:mb-16">
        <span className="section-eyebrow">Your workflow</span>
        <h2 className="tp-display text-[var(--color-text-primary)]">
          From chart to conviction in three steps
        </h2>
        <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">
          No spreads to configure. No 50-tab setup. Just the answer you&apos;d ask a senior trader for.
        </p>
      </AnimatedSection>

      <StaggerChildren className="grid md:grid-cols-3 gap-5 sm:gap-6">
        {steps.map((s, i) => (
          <StaggerChild key={i}>
            <div className="card p-6 space-y-4 h-full">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-primary-subtle)", color: "var(--color-accent-primary)", border: "1px solid rgba(6,182,212,0.12)" }}>
                  {s.icon}
                </div>
                <span className="text-[11px] font-mono font-semibold tracking-wider" style={{ color: "var(--color-text-quaternary)" }}>
                  {s.n}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{s.title}</h3>
              <p className="text-[13px] text-[var(--color-text-tertiary)] leading-relaxed">{s.body}</p>
            </div>
          </StaggerChild>
        ))}
      </StaggerChildren>
    </section>
  );
}