import { Check } from "lucide-react";
import { AnimatedSection } from "./scroll-animator";

// Factual feature presence matrix — no superiority claims, no checkmark/X
// "we win" framing. Each row is a verifiable capability of each platform.
// Where a platform doesn't offer a feature, we leave the cell neutral
// rather than marking it "missing" with a red X, which would imply
// TradCopilot is objectively better.
const rows: { label: string; tp: boolean; tv: boolean; gpt: boolean }[] = [
  { label: "Advanced charting", tp: true, tv: true, gpt: false },
  { label: "Technical indicators (RSI, MACD, EMA, ATR)", tp: true, tv: true, gpt: false },
  { label: "Watchlists", tp: true, tv: true, gpt: false },
  { label: "AI-assisted trade analysis", tp: true, tv: false, gpt: true },
  { label: "Trade journal with persistent memory", tp: true, tv: false, gpt: false },
  { label: "Risk calculator", tp: true, tv: false, gpt: false },
  { label: "Behavioral coaching (revenge / overtrading)", tp: true, tv: false, gpt: false },
  { label: "Read-only — no broker connection required", tp: true, tv: true, gpt: true },
  { label: "Free tier available", tp: true, tv: true, gpt: true },
];

function Cell({ on }: { on: boolean }) {
  if (on) {
    return (
      <div className="flex items-center justify-center">
        <Check size={14} className="text-accent" />
      </div>
    );
  }
  // Neutral absence — no red X, no "missing" framing.
  return <div className="flex items-center justify-center text-muted-foreground/30 text-[10px]">—</div>;
}

export function Comparison() {
  return (
    <section className="max-w-4xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <AnimatedSection className="text-center space-y-3 mb-12 sm:mb-14">
        <span className="section-eyebrow">How it compares</span>
        <h2 className="tp-display text-[var(--color-text-primary)]">
          A factual look at what each tool offers
        </h2>
        <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-md mx-auto leading-relaxed">
          TradCopilot doesn&apos;t replace your charting platform — it adds an analysis, journaling, and coaching layer on top.
        </p>
      </AnimatedSection>

      <AnimatedSection delay={150}>
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="grid grid-cols-4 text-[12px] sm:text-[13px]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border" />
            <div className="p-4 sm:p-5 border-b border-border text-center">
              <div className="text-[13px] sm:text-[14px] font-bold text-foreground">TradCopilot</div>
              <div className="text-[10px] font-mono text-accent mt-0.5">Free to start</div>
            </div>
            <div className="p-4 sm:p-5 border-b border-border text-center">
              <div className="text-[13px] sm:text-[14px] font-semibold text-muted-foreground">TradingView</div>
              <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">Charting platform</div>
            </div>
            <div className="p-4 sm:p-5 border-b border-border text-center">
              <div className="text-[13px] sm:text-[14px] font-semibold text-muted-foreground">ChatGPT</div>
              <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">General AI</div>
            </div>

            {/* Rows */}
            {rows.map((r, i) => (
              <div key={i} className="contents">
                <div className="p-4 sm:p-5 border-b border-border/60 text-[12px] sm:text-[13px] text-foreground/90 font-medium">
                  {r.label}
                </div>
                <div className="p-4 sm:p-5 border-b border-border/60 bg-accent/[0.03]">
                  <Cell on={r.tp} />
                </div>
                <div className="p-4 sm:p-5 border-b border-border/60">
                  <Cell on={r.tv} />
                </div>
                <div className="p-4 sm:p-5 border-b border-border/60">
                  <Cell on={r.gpt} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-4 text-center leading-relaxed">
          Comparison reflects features available as of {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Other platforms may offer capabilities outside this list.
        </p>
      </AnimatedSection>
    </section>
  );
}