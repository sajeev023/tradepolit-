import { Reveal } from "@/components/ui/reveal";

const ITEMS = [
  {
    n: "01",
    title: "Reads the chart",
    body: "Live RSI, MACD, EMA and ATR on every pair, turned into a plain-English read with levels and an invalidation point.",
  },
  {
    n: "02",
    title: "Remembers your trades",
    body: "Your journal and thesis outcomes become personal patterns — which setups work for you, and which ones don't.",
  },
  {
    n: "03",
    title: "Guards your discipline",
    body: "Flags revenge trades and overtrading, and does the position-size math before you click, not after.",
  },
] as const;

/** Three promises, each backed by a shipped feature. Sits directly under the live product. */
export function CapabilityStrip() {
  return (
    <Reveal className="mt-10 sm:mt-14">
      <div className="grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3" style={{ background: "var(--hairline)", borderColor: "var(--hairline)" }}>
        {ITEMS.map((it) => (
          <div key={it.n} className="flex flex-col gap-3 p-6 sm:p-7" style={{ background: "var(--panel-1)" }}>
            <span className="font-mono text-[11px] tracking-[0.14em]" style={{ color: "var(--accent)" }}>{it.n}</span>
            <h3 className="font-serif text-[26px] leading-[1.05] tracking-[-0.01em] text-[var(--ink)]">{it.title}</h3>
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{it.body}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
