import { ArrowRight, Database, Cpu, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const stages = [
  {
    step: "01",
    tag: "TELEMETRY",
    icon: Database,
    title: "Market Ingestion",
    body: "Real-time Binance and OANDA telemetry streams directly into the workstation. Price action, order book volume, and multi-timeframe candles load automatically without manual chart configuration.",
    metric: "Direct WebSocket Feed",
  },
  {
    step: "02",
    tag: "SYNTHESIS",
    icon: Cpu,
    title: "Multi-Model Technical Scan",
    body: "RSI momentum, MACD divergence, EMA trend alignment, and pivot support/resistance levels are computed in parallel to construct a structured setup with explicit invalidation prices.",
    metric: "Sub-3s Multi-Model Race",
  },
  {
    step: "03",
    tag: "VERIFICATION",
    icon: ShieldCheck,
    title: "Behavioral Rule Guardrails",
    body: "Every candidate trade is cross-referenced against your declared risk plan and historical 20-trade journal patterns to flag revenge trading, unplanned sizing spikes, or overtrading before entry.",
    metric: "Rule Compliance Check",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="tc-section tc-section--wide scroll-mt-20">
      <Reveal blur className="text-center space-y-3 mb-12 sm:mb-14">
        <span className="tp-eyebrow-mono">01 / WORKFLOW</span>
        <h2 className="tp-h2">
          End-to-end technical analysis &amp; risk verification
        </h2>
        <p className="tp-body max-w-lg mx-auto">
          A structured execution pipeline that moves from raw market data to a disciplined, rule-checked thesis in seconds.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.step} delay={i * 80} className="tc-card h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[var(--accent)] tracking-wider">
                    {s.step} / {s.tag}
                  </span>
                  <div className="w-7 h-7 rounded-md bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center text-[var(--accent)]">
                    <Icon size={14} />
                  </div>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-[var(--ink)] tracking-tight mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                    {s.body}
                  </p>
                </div>

                {i === 1 && (
                  <div className="my-2 p-3 rounded-md bg-[var(--bg-band)] border border-[var(--color-border-subtle)] space-y-2 select-none font-mono">
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
                  </div>
                )}
              </div>

              <div className="pt-4 mt-auto border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
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