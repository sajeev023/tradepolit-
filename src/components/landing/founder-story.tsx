import { Reveal } from "@/components/ui/reveal";
import { Shield, Eye, Clock, Terminal } from "lucide-react";

const principles = [
  {
    icon: Terminal,
    title: "Read-Only Architecture",
    body: "No broker keys, no fund custody, and no automated trade execution. Your accounts and assets remain entirely under your control.",
  },
  {
    icon: Eye,
    title: "Real-Time Telemetry",
    body: "Direct public Binance WebSocket streams and calculated indicators provide verifiable data without simulated delays.",
  },
  {
    icon: Clock,
    title: "20-Trade Session Memory",
    body: "Session history stays in memory so the terminal detects recurring revenge trade and overtrading patterns before entry.",
  },
  {
    icon: Shield,
    title: "Deterministic Risk Rules",
    body: "Setup recommendations enforce structural pivot invalidations and fixed risk limits rather than arbitrary AI guesses.",
  },
];

export function FounderStory() {
  return (
    <section className="tc-section tc-section--narrow tc-band-alt">
      <Reveal blur className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10 lg:mb-12">
        <span className="tp-eyebrow-mono">FOUNDATION</span>
        <h2 className="tp-h2 max-w-2xl mx-auto">
          Built for disciplined execution
        </h2>
        <p className="tp-body max-w-xl mx-auto">
          TradCopilot was built to automate chart routines and protect active traders from emotional mistakes during high-volatility sessions.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {principles.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.title} delay={i * 60} className="tc-card space-y-1.5 sm:space-y-2 p-3.5 sm:p-4 lg:p-5">
              <div className="flex items-center gap-2 sm:gap-2.5 text-[var(--accent)] font-semibold text-[12px] sm:text-[13px]">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-[rgba(var(--accent-rgb),0.08)] border border-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center">
                  <Icon size={13} />
                </div>
                <span>{p.title}</span>
              </div>
              <p className="tc-card__body text-[11px] sm:text-[12px] leading-relaxed">
                {p.body}
              </p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}