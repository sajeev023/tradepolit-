import { ArrowRight, Database, Cpu, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    step: "01",
    tag: "TELEMETRY",
    icon: Database,
    title: "Market Ingestion",
    body: "Real-time Binance candle data and multi-source OHLCV feeds stream directly into the workstation. Price action, volume, and multi-timeframe candles load automatically without manual chart configuration.",
    metric: "Binance WebSocket Feed",
  },
  {
    step: "02",
    tag: "SYNTHESIS",
    icon: Cpu,
    title: "Multi-Model Technical Scan",
    body: "RSI momentum, MACD histogram, EMA trend alignment, and swing support/resistance levels are computed from OHLCV candles to construct a structured setup with explicit invalidation prices.",
    metric: "Multi-Model Race Pipeline",
  },
  {
    step: "03",
    tag: "VERIFICATION",
    icon: ShieldCheck,
    title: "Behavioral Rule Guardrails",
    body: "Every candidate trade is cross-referenced against your declared risk plan and your last 20 logged trades to flag revenge-style re-entries and overtrading before you enter — it warns, it never blocks.",
    metric: "Warn-Only · Read-Only",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10 lg:mb-14">
        <span className="tp-eyebrow-mono">01 / WORKFLOW</span>
        <h2 className="tp-h2">
          End-to-end technical analysis &amp; risk verification
        </h2>
        <p className="tp-body max-w-lg mx-auto">
          A structured pipeline that moves from raw market data to a disciplined, rule-checked thesis.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.step} delay={i * 80} className="tc-card h-full flex flex-col justify-between">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--accent)] tracking-wider">
                    {s.step} / {s.tag}
                  </span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center text-[var(--accent)]">
                    <Icon size={13} />
                  </div>
                </div>

                <div>
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-[var(--ink)] tracking-tight mb-1 sm:mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[12px] sm:text-[13px] text-[var(--muted)] leading-relaxed">
                    {s.body}
                  </p>
                </div>

                {i === 1 && (
                  <div className="my-1.5 p-2.5 sm:p-3 rounded-md bg-[var(--bg-band)] border border-[var(--color-border-subtle)] space-y-1.5 sm:space-y-2 select-none font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--green)] font-bold">BIAS: BUY / LONG</span>
                      <span className="text-[9px] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.08)] rounded px-1.5 py-0.5">
                        CONFIDENCE: HIGH
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Entry</span>
                        <span className="text-[var(--ink)] font-semibold">$67,420</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Stop (Invalid)</span>
                        <span className="text-[var(--red)] font-semibold">$66,800</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-wider block text-[var(--muted)]">Take-Profit</span>
                        <span className="text-[var(--green)] font-semibold">$68,900</span>
                      </div>
                    </div>
                    <div className="pt-1 text-[8px] tracking-wider text-[var(--muted)] font-mono">
                      ILLUSTRATIVE EXAMPLE — NOT A RECOMMENDATION
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 sm:pt-4 mt-auto border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--muted)]">
                <span>{s.metric}</span>
                <ArrowRight size={13} className="text-[var(--accent)]" />
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}