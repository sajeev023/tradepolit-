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
    cat: "Discipline",
    value: "<30 min",
    label: "Revenge-re-entry window flagged",
    gloss: "fast re-entries after a loss get flagged",
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
      <div className="tc-section !py-6 sm:!py-10 lg:!py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border-subtle)] rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--color-border-subtle)]">
          {metrics.map((m, i) => (
            <Reveal
              key={m.cat}
              delay={i * 70}
              className="bg-[var(--bg-band)] p-3.5 sm:p-5 lg:p-6 flex flex-col gap-1 sm:gap-1.5"
            >
              <div className="tc-metric-cat text-[9px] sm:text-[10px]">{m.cat}</div>
              <div className="tp-mono text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--ink)] tabular-nums tracking-tight">
                {m.value}
              </div>
              <div className="text-[12px] sm:text-[13px] font-semibold text-[var(--ink)] leading-tight">{m.label}</div>
              <div className="text-[10px] sm:text-[11px] text-[var(--muted)] font-mono leading-tight">{m.gloss}</div>
            </Reveal>
          ))}
        </div>
        <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] text-[var(--muted)] font-mono text-center">
          Product specifications · Zero performance claims.
        </p>
      </div>
    </section>
  );
}