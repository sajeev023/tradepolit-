import { Reveal } from "@/components/ui/reveal";
import { Shield, Eye, Clock, Terminal } from "lucide-react";

const principles = [
  {
    icon: Terminal,
    title: "Read-only architecture",
    body: "No broker keys, no fund custody, and no automated trade execution. Your accounts and assets remain entirely under your control.",
  },
  {
    icon: Eye,
    title: "Real-time telemetry",
    body: "Direct public Binance WebSocket streams and calculated indicators provide verifiable data without simulated delays.",
  },
  {
    icon: Clock,
    title: "20-trade session memory",
    body: "Session history stays in memory so the terminal detects recurring revenge-trade and overtrading patterns before entry.",
  },
  {
    icon: Shield,
    title: "Deterministic risk rules",
    body: "Setup recommendations enforce structural pivot invalidations and fixed risk limits rather than arbitrary AI guesses.",
  },
];

export function FounderStory() {
  return (
    <section className="tc-section tc-section--wide tc-band-alt">
      <Reveal blur className="mx-auto mb-10 max-w-[720px] text-center sm:mb-14">
        <span className="tp-eyebrow-mono">Foundation</span>
        <h2 className="mt-3 font-serif text-[clamp(32px,6vw,56px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
          Built for <em className="text-[var(--accent)]">disciplined</em> execution.
        </h2>
        <p className="tp-body mx-auto mt-4 max-w-[520px]">
          TradePilot automates chart routines and protects active traders from emotional mistakes during high-volatility sessions.
        </p>
      </Reveal>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-2">
        {principles.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.title} delay={i * 60} className="flex gap-4 bg-[var(--panel-1)] p-5 sm:p-7">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)" }}
              >
                <Icon size={18} />
              </span>
              <div>
                <h3 className="font-serif text-[23px] leading-tight tracking-[-0.01em] text-[var(--ink)]">{p.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">{p.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
