import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ExpectancyCalculator } from "./expectancy-calculator";

const tiers = [
  {
    name: "Free",
    tag: "Starter",
    price: "$0",
    cadence: "forever",
    description: "Core market telemetry and basic setup scans for individual traders.",
    cta: "Get started free",
    href: "/signup",
    isPro: false,
    groups: [
      { title: "Technical analysis", items: ["5 AI chart scans / day", "Standard response speed", "OHLCV candle telemetry"] },
      { title: "Journal & memory", items: ["Last 20 trades session memory", "Standard trade logging"] },
      { title: "Discipline & alerts", items: ["3 active price alerts", "Basic discipline tracking"] },
    ],
  },
  {
    name: "Pro Terminal",
    tag: "Full capacity",
    price: "$7.49",
    cadence: "month · billed monthly",
    description: "Unlimited high-speed multi-model scans and full behavioral guardrails.",
    cta: "Start 7-day Pro trial",
    href: "/signup?plan=pro",
    isPro: true,
    groups: [
      { title: "Technical analysis", items: ["Unlimited AI chart scans", "Multi-model race pipeline (<3s)", "Full indicator matrix (RSI, MACD, EMA, ATR)"] },
      { title: "Journal & memory", items: ["Persistent full history trade journal", "Weekly performance & risk audit reports", "Saved snapshot analysis library"] },
      { title: "Discipline & alerts", items: ["Real-time revenge & overtrading guardrails", "Position sizing anomaly detection", "Unlimited sub-20s level alerts"] },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="mx-auto mb-10 max-w-[720px] text-center sm:mb-14">
        <span className="tp-eyebrow-mono">04 / Pricing</span>
        <h2 className="mt-3 font-serif text-[clamp(32px,6vw,56px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
          Simple pricing. <em className="text-[var(--accent)]">No surprises.</em>
        </h2>
        <p className="tp-body mx-auto mt-4 max-w-[420px]">Start free with no credit card. Upgrade for full terminal capacity.</p>
      </Reveal>

      <Reveal delay={80} className="mx-auto mb-6 max-w-3xl sm:mb-10">
        <ExpectancyCalculator />
      </Reveal>

      <div className="mx-auto grid max-w-3xl items-stretch gap-4 sm:gap-5 md:grid-cols-2">
        {tiers.map((tier, i) => (
          <Reveal
            key={tier.name}
            delay={i * 80}
            className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 sm:p-7 ${
              tier.isPro
                ? "border-[rgba(var(--accent-rgb),0.4)] bg-[var(--panel-2)]"
                : "border-[var(--hairline)] bg-[var(--panel-1)]"
            }`}
          >
            {tier.isPro && (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }}
              />
            )}

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{tier.tag}</span>
              {tier.isPro && (
                <span
                  className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]"
                  style={{ background: "rgba(var(--accent-rgb),0.1)", border: "1px solid rgba(var(--accent-rgb),0.28)" }}
                >
                  7-day trial
                </span>
              )}
            </div>

            <h3 className="mt-4 text-[15px] font-semibold text-[var(--ink)]">{tier.name}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-[56px] leading-none tracking-[-0.03em] text-[var(--ink)]">{tier.price}</span>
              <span className="font-mono text-[11px] text-[var(--color-text-tertiary)]">/ {tier.cadence}</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{tier.description}</p>

            <div className="my-6 space-y-5 border-t border-[var(--hairline)] pt-6">
              {tier.groups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">{group.title}</div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--ink)]">
                        <Check size={14} className="mt-[1px] shrink-0 text-[var(--accent)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Link href={tier.href} className={`${tier.isPro ? "btn-primary" : "btn-secondary"} btn-lg mt-auto w-full`}>
              {tier.cta}
              {tier.isPro && <ArrowRight size={15} />}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
