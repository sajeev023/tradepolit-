import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ExpectancyCalculator } from "./expectancy-calculator";

const freeFeatures = [
  "5 AI chart analyses / day",
  "Standard response speed",
  "Last 20 trades in memory",
  "Behavioral coaching basics",
];

const proFeatures = [
  "Unlimited AI chart analyses",
  "Multi-model race pipeline (<3s)",
  "Persistent 20-trade memory & full journal",
  "Real-time revenge & overtrading detection",
  "Weekly AI performance & risk reports",
];

export function PricingSection() {
  return (
    <section id="pricing" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-3 mb-12">
        <span className="tp-eyebrow-mono">Pricing</span>
        <h2 className="tp-h2">
          Start free. Upgrade when <span className="tc-accent-phrase">you&apos;re ready.</span>
        </h2>
        <p className="tp-body max-w-sm mx-auto">
          No credit card to start. Cancel anytime in one click.
        </p>
      </Reveal>

      {/* Calculator directly above the cards */}
      <Reveal delay={80} className="max-w-3xl mx-auto mb-8">
        <ExpectancyCalculator />
      </Reveal>

      <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto items-stretch">
        {/* Free */}
        <Reveal className="tc-card h-full">
          <div className="flex items-center justify-between">
            <span className="tc-card__badge">Free tier</span>
            <span className="tc-badge">No card</span>
          </div>
          <h3 className="tc-card__title">Free</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[2.25rem] font-bold text-[var(--ink)] tabular-nums">$0</span>
            <span className="text-[12px] text-[var(--muted)]">/ forever</span>
          </div>
          <p className="tc-card__body">For occasional traders who want a second opinion before entries.</p>
          <div className="tc-card__divider" />
          <ul className="space-y-2.5">
            {freeFeatures.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--ink)]">
                <Check size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="tc-hover mt-2 h-11 rounded-lg border border-[var(--color-border-strong)] text-[13px] font-semibold text-[var(--ink)] flex items-center justify-center hover:border-[var(--accent)] transition-colors"
          >
            Start Free — No Card
          </Link>
        </Reveal>

        {/* Pro */}
        <Reveal delay={80} className="tc-card h-full" >
          <div className="flex items-center justify-between">
            <span className="tc-card__badge">Pro terminal</span>
            <span className="tc-badge tc-badge--accent">Most popular</span>
          </div>
          <h3 className="tc-card__title">Pro Terminal</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[2.25rem] font-bold text-[var(--ink)] tabular-nums tracking-tight">$7.49</span>
            <span className="text-[12px] text-[var(--muted)]">/ month · cancel anytime</span>
          </div>
          <p className="tc-card__body">For active day traders who want unlimited scans and full behavioral enforcement.</p>
          <div className="tc-card__divider" />
          <ul className="space-y-2.5">
            {proFeatures.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-[var(--ink)]">
                <Check size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/signup?plan=pro"
            className="group mt-2 h-11 rounded-lg text-[13px] font-bold text-[var(--bg-primary)] flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
            style={{ background: "var(--accent)" }}
          >
            Start 7-Day Pro Trial
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}