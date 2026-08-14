"use client";

import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";

/* Real product specifications sourced from the existing pricing/features copy —
   not user-performance claims. Disclosed below to satisfy the no-fabricated-data
   rule. Count-up animates 0 → value on scroll (1.1s eased). */
const metrics = [
  { cat: "Memory", value: 20, suffix: "", label: "Trades in copilot memory", sub: "Free tier context window" },
  { cat: "Throughput", value: 5, suffix: "", label: "AI chart scans / day", sub: "Free, no card required" },
  { cat: "Latency", value: 20, suffix: "s", label: "Alert check cadence", sub: "Technical conditions polled live" },
  { cat: "Trial", value: 7, suffix: "-day", label: "Pro trial", sub: "Unlimited scans, cancel anytime" },
];

export function MetricsBand() {
  return (
    <section className="tc-band-alt">
      <div className="tc-section !py-12 sm:!py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border-subtle)] rounded-2xl overflow-hidden border border-[var(--color-border-subtle)]">
          {metrics.map((m, i) => (
            <Reveal
              key={m.label}
              delay={i * 70}
              className="bg-[var(--bg-band)] p-5 sm:p-6 flex flex-col gap-1"
            >
              <div className="tc-metric-cat">{m.cat}</div>
              <div className="tp-mono text-3xl sm:text-4xl font-semibold text-[var(--ink)] tabular-nums tracking-tight">
                <CountUp value={m.value} suffix={m.suffix} />
              </div>
              <div className="text-[13px] font-semibold text-[var(--ink)] leading-tight">{m.label}</div>
              <div className="text-[11px] text-[var(--muted)] leading-tight">{m.sub}</div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-[var(--muted)] font-mono text-center">
          Product specifications — not performance claims.
        </p>
      </div>
    </section>
  );
}