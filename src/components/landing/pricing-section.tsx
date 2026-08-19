import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ExpectancyCalculator } from "./expectancy-calculator";

const tiers = [
  {
    name: "Free",
    tag: "STARTER",
    price: "$0",
    cadence: "forever",
    description: "Core market telemetry and basic setup scans for individual traders.",
    cta: "Get Started Free",
    href: "/signup",
    isPro: false,
    groups: [
      {
        title: "Technical Analysis",
        items: ["5 AI chart scans / day", "Standard response speed", "OHLCV candle telemetry"],
      },
      {
        title: "Journal & Memory",
        items: ["Last 20 trades session memory", "Standard trade logging"],
      },
      {
        title: "Discipline & Alerts",
        items: ["3 active price alerts", "Basic discipline tracking"],
      },
    ],
  },
  {
    name: "Pro Terminal",
    tag: "INSTITUTIONAL",
    price: "$7.49",
    cadence: "month · billed monthly",
    description: "Unlimited high-speed multi-model scans and full behavioral guardrails.",
    cta: "Start 7-Day Pro Trial",
    href: "/signup?plan=pro",
    isPro: true,
    groups: [
      {
        title: "Technical Analysis",
        items: ["Unlimited AI chart scans", "Multi-model race pipeline (<3s)", "Full indicator matrix (RSI, MACD, EMA, ATR)"],
      },
      {
        title: "Journal & Memory",
        items: ["Persistent full history trade journal", "Weekly performance & risk audit reports", "Saved snapshot analysis library"],
      },
      {
        title: "Discipline & Alerts",
        items: ["Real-time revenge & overtrading guardrails", "Position sizing anomaly detection", "Unlimited sub-20s level alerts"],
      },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-3 mb-12">
        <span className="tp-eyebrow-mono">04 / PRICING</span>
        <h2 className="tp-h2">
          Transparent, utility-based pricing
        </h2>
        <p className="tp-body max-w-sm mx-auto">
          Start free with zero credit card commitment. Upgrade for full terminal capacity.
        </p>
      </Reveal>

      {/* Calculator directly above the cards */}
      <Reveal delay={80} className="max-w-3xl mx-auto mb-8">
        <ExpectancyCalculator />
      </Reveal>

      <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto items-stretch">
        {tiers.map((tier, i) => (
          <Reveal
            key={tier.name}
            delay={i * 80}
            className={`tc-card h-full flex flex-col justify-between ${
              tier.isPro ? "border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.02)]" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-semibold text-[var(--accent)] tracking-wider">
                  {tier.tag}
                </span>
                {tier.isPro && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.25)]">
                    7-DAY TRIAL
                  </span>
                )}
              </div>

              <h3 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">
                {tier.name}
              </h3>

              <div className="flex items-baseline gap-1.5 my-2">
                <span className="font-mono text-[2.25rem] font-bold text-[var(--ink)] tabular-nums">
                  {tier.price}
                </span>
                <span className="text-[12px] text-[var(--muted)] font-mono">/ {tier.cadence}</span>
              </div>

              <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">
                {tier.description}
              </p>

              <div className="tc-card__divider" />

              <div className="space-y-4 mb-6">
                {tier.groups.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                      {group.title}
                    </div>
                    <ul className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[12px] text-[var(--ink)]">
                          <Check size={13} className="text-[var(--accent)] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={tier.href}
              className={`h-11 rounded-md text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] ${
                tier.isPro
                  ? "text-[var(--bg-primary)] shadow-sm"
                  : "border border-[var(--color-border-strong)] text-[var(--ink)] hover:border-[var(--accent)]"
              }`}
              style={tier.isPro ? { background: "var(--accent)" } : {}}
            >
              <span>{tier.cta}</span>
              {tier.isPro && <ArrowRight size={14} />}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}