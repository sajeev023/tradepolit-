import { Reveal } from "@/components/ui/reveal";

/* Real product specifications from the pricing/features copy, rendered on first paint.
   No performance claims — only what the product actually does. */
const metrics = [
  { cat: "Memory", value: "20", label: "Trades in Copilot memory", gloss: "Your last 20 logged trades inform every answer." },
  { cat: "Throughput", value: "5", label: "AI chart scans per day", gloss: "On the free plan." },
  { cat: "Discipline", value: "<30m", label: "Re-entry window flagged", gloss: "Fast re-entries after a loss get a warning." },
  { cat: "Trial", value: "7d", label: "Pro trial", gloss: "Cancel anytime." },
];

export function MetricsBand() {
  return (
    <section className="tc-band-alt">
      <div className="tc-section !py-8 sm:!py-12 lg:!py-16">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal key={m.cat} delay={i * 70} className="flex flex-col gap-2 bg-[var(--panel-1)] p-4 sm:p-6 lg:p-7">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{m.cat}</span>
              <span className="font-serif text-[44px] leading-none tracking-[-0.03em] text-[var(--ink)] sm:text-[56px] lg:text-[64px]">
                {m.value}
              </span>
              <span className="text-[13px] font-medium leading-tight text-[var(--ink)]">{m.label}</span>
              <span className="text-[12px] leading-snug text-[var(--color-text-tertiary)]">{m.gloss}</span>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">
          Product specifications · zero performance claims
        </p>
      </div>
    </section>
  );
}
