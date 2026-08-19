import { Reveal } from "@/components/ui/reveal";

/* Real product specifications sourced from the pricing/features copy —
   pre-rendered directly so the final values appear on first paint without 0-flash.
   Human-readable glosses explain the tier specifications truthfully. */
const metrics = [
  {
    cat: "Memory",
    value: "20",
    label: "Trades in copilot memory",
    gloss: "trades the copilot remembers",
  },
  {
    cat: "Throughput",
    value: "5",
    label: "AI chart scans / day",
    gloss: "AI chart scans per day (free)",
  },
  {
    cat: "Latency",
    value: "20s",
    label: "Alert check cadence",
    gloss: "alert check cadence",
  },
  {
    cat: "Trial",
    value: "7-day",
    label: "Pro trial",
    gloss: "pro trial, cancel anytime",
  },
];

export function MetricsBand() {
  return (
    <section className="tc-band-alt">
      <div className="tc-section !py-12 sm:!py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border-subtle)] rounded-2xl overflow-hidden border border-[var(--color-border-subtle)]">
          {metrics.map((m, i) => (
            <Reveal
              key={m.cat}
              delay={i * 70}
              className="bg-[var(--bg-band)] p-5 sm:p-6 flex flex-col gap-1.5"
            >
              <div className="tc-metric-cat">{m.cat}</div>
              <div className="tp-mono text-3xl sm:text-4xl font-semibold text-[var(--ink)] tabular-nums tracking-tight">
                {m.value}
              </div>
              <div className="text-[13px] font-semibold text-[var(--ink)] leading-tight">{m.label}</div>
              <div className="text-[11px] text-[var(--muted)] font-mono leading-tight">{m.gloss}</div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-[var(--muted)] font-mono text-center">
          Product specifications · Zero performance claims.
        </p>
      </div>
    </section>
  );
}