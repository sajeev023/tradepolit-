import { Reveal } from "@/components/ui/reveal";

const founders = [
  {
    name: "Sajeev",
    initials: "SK",
    role: "Product & Engineering",
    note: "Self-taught builder · Hyderabad · trades daily",
    quote: "AI should improve human decisions, not replace them.",
  },
  {
    name: "Trading Lead",
    initials: "TL",
    role: "Trading & Validation",
    note: "Active crypto & forex trader · trades daily",
    quote: "I didn't want a bot. I wanted a copilot that helps me think clearly.",
  },
];

const chips = [
  "READ-ONLY BY DESIGN",
  "NO BROKER ACCESS",
  "REAL-TRADER FEEDBACK",
  "SHIPPED WEEKLY",
];

export function FounderStory() {
  return (
    <section className="tc-section tc-section--narrow tc-band-alt">
      <Reveal blur className="text-center space-y-4 mb-12">
        <span className="tp-eyebrow-mono">Why we built TradCopilot</span>
        <h2 className="tp-h2 max-w-2xl mx-auto">
          Built from trading frustration, <span className="tc-accent-phrase">not a trend.</span>
        </h2>
        <p className="tp-body max-w-xl mx-auto">
          TradCopilot didn&apos;t start because AI became popular. One of us trades every day — and the
          repetitive analysis was eating hours. So we built a copilot that handles the grind while the
          trader stays in control.
        </p>
      </Reveal>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-8">
        {founders.map((f, i) => (
          <Reveal key={i} delay={i * 80} className="tc-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl border border-[var(--color-border-strong)] bg-[var(--bg-band)] flex items-center justify-center">
                <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">{f.initials}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[var(--ink)]">{f.name}</span>
                  <span className="text-[11px] text-[var(--muted)]">·</span>
                  <h3 className="text-[13px] font-semibold text-[var(--muted)] leading-tight">{f.role}</h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--muted)]">{f.note}</span>
              </div>
            </div>
            <p className="tc-card__body italic mt-2">&ldquo;{f.quote}&rdquo;</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={160} className="flex flex-wrap items-center justify-center gap-2">
        {chips.map((c) => (
          <span key={c} className="tc-badge text-[10px] font-mono tracking-wider">{c}</span>
        ))}
      </Reveal>
    </section>
  );
}