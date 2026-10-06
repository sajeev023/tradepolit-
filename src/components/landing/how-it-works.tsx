import { Database, Cpu, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    step: "01",
    tag: "Telemetry",
    icon: Database,
    title: "Market ingestion",
    body: "Real-time Binance candle data and multi-source OHLCV feeds stream straight into the workstation. Price, volume and multi-timeframe candles load without any manual chart setup.",
    metric: "Binance WebSocket feed",
  },
  {
    step: "02",
    tag: "Synthesis",
    icon: Cpu,
    title: "Multi-model technical scan",
    body: "RSI momentum, MACD histogram, EMA alignment and swing support/resistance are computed from the candles to build a structured setup with explicit invalidation prices.",
    metric: "Multi-model race pipeline",
  },
  {
    step: "03",
    tag: "Verification",
    icon: ShieldCheck,
    title: "Behavioral guardrails",
    body: "Every candidate trade is checked against your declared risk plan and your last 20 logged trades to flag revenge re-entries and overtrading before you enter. It warns; it never blocks.",
    metric: "Warn-only · read-only",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="mx-auto mb-10 max-w-[720px] text-center sm:mb-14">
        <span className="tp-eyebrow-mono">01 / Flight path</span>
        <h2 className="mt-3 font-serif text-[clamp(32px,6vw,56px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
          From raw ticks to a <em className="text-[var(--accent)]">rule-checked</em> thesis.
        </h2>
        <p className="tp-body mx-auto mt-4 max-w-[480px]">
          A structured pipeline that moves from market data to a disciplined, verifiable plan.
        </p>
      </Reveal>

      <ol className="relative grid gap-4 max-lg:pl-9 lg:grid-cols-3 lg:gap-5">
        {/* flight line: vertical rail on phones, horizontal on desktop */}
        <span
          aria-hidden
          className="absolute bottom-6 left-[13px] top-6 w-px lg:hidden"
          style={{ background: "linear-gradient(to bottom, rgba(var(--accent-rgb),0.6), var(--hairline))" }}
        />
        <span
          aria-hidden
          className="absolute left-[16.6%] right-[16.6%] top-[13px] hidden h-px lg:block"
          style={{ background: "linear-gradient(90deg, rgba(var(--accent-rgb),0.6), var(--hairline) 50%, rgba(var(--accent-rgb),0.6))" }}
        />

        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.step} className="relative lg:pt-9">
              <span
                aria-hidden
                className="absolute left-[-36px] top-5 flex h-[27px] w-[27px] items-center justify-center rounded-full border lg:left-1/2 lg:top-0 lg:-translate-x-1/2"
                style={{ background: "var(--background)", borderColor: "rgba(var(--accent-rgb),0.55)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),0.8)" }} />
              </span>

              <Reveal
                delay={i * 80}
                className="flex h-full flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--panel-1)] p-5 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                    Stage {s.step} · {s.tag}
                  </span>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)" }}
                  >
                    <Icon size={15} />
                  </span>
                </div>

                <h3 className="mt-5 font-serif text-[26px] leading-[1.08] tracking-[-0.01em] text-[var(--ink)]">{s.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">{s.body}</p>

                {i === 1 && (
                  <div className="mt-5 select-none rounded-xl border border-[var(--hairline)] bg-[var(--panel-2)] p-3.5 font-mono">
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="font-semibold text-[var(--green)]">BIAS · LONG</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9.5px] text-[var(--accent)]"
                        style={{ border: "1px solid rgba(var(--accent-rgb),0.3)", background: "rgba(var(--accent-rgb),0.08)" }}
                      >
                        CONFIDENCE · HIGH
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-[var(--muted)]">Entry</span>
                        <span className="font-semibold text-[var(--ink)]">$67,420</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-[var(--muted)]">Invalid</span>
                        <span className="font-semibold text-[var(--red)]">$66,800</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-[var(--muted)]">Target</span>
                        <span className="font-semibold text-[var(--green)]">$68,900</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[9px] uppercase tracking-wider text-[var(--muted)]">Illustrative example — not a recommendation</p>
                  </div>
                )}

                <div className="min-h-6 flex-1" />
                <div className="flex items-center gap-2 border-t border-[var(--hairline)] pt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  {s.metric}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
