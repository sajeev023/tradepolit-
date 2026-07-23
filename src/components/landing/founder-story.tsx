"use client";

import { AnimatedSection } from "./scroll-animator";

const milestones = [
  {
    marker: "01",
    title: "The frustration was real",
    body: "One of us trades crypto and forex every day — hours of chart analysis, indicator checking, and risk management. The same repetitive work, every session. The question kept coming up: what if an AI could handle the repetitive analysis while the trader stays in control?",
  },
  {
    marker: "02",
    title: "First version in six hours",
    body: "Instead of spending months planning, we built the first working MVP in about six hours spread across three days. The goal was to validate the idea quickly — not to build a perfect product.",
  },
  {
    marker: "03",
    title: "Real traders, real feedback",
    body: "Within the first week, three experienced traders from different locations — including India and Boston — started testing the product in real trading situations. We met them repeatedly on Google Meet. They reported bugs, confusing workflows, UX issues, and missing features.",
  },
  {
    marker: "04",
    title: "Every improvement earned",
    body: "One founder implemented product and UI changes. The other validated whether the product genuinely helped traders in real workflows. Every major improvement came from conversations with real traders rather than assumptions.",
  },
];

export function FounderStory() {
  return (
    <section className="max-w-4xl mx-auto px-6 lg:px-10 py-20 lg:py-32">
      {/* Section header */}
      <AnimatedSection className="text-center space-y-4 mb-16 sm:mb-20">
        <span className="section-eyebrow">Why We Built TradCopilot</span>
        <h2 className="text-[26px] sm:text-[36px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
          Built from trading frustration, not a trend
        </h2>
        <p className="text-[14px] text-zinc-400 max-w-lg mx-auto leading-relaxed">
          TradCopilot didn&apos;t start because AI became popular. It started because one of us spends hours every day doing analysis that an AI copilot could support — without replacing the trader.
        </p>
      </AnimatedSection>

      {/* Founders */}
      <AnimatedSection delay={100}>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 mb-16 sm:mb-20">
          {/* Founder 1 */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <span className="text-[13px] font-bold text-accent">F1</span>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">Product &amp; Engineering</h3>
                <span className="text-[11px] text-muted-foreground font-mono">17 · Hyderabad, India</span>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Self-taught product designer and frontend engineer. Started building startups while still in junior college — learning through real projects rather than coursework. Responsible for product vision, UI/UX, AI product experience, and execution.
            </p>
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed italic">
              &quot;AI should improve human decision-making rather than replace humans.&quot;
            </p>
          </div>

          {/* Founder 2 */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <span className="text-[13px] font-bold text-accent">F2</span>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">Trading &amp; Validation</h3>
                <span className="text-[11px] text-muted-foreground font-mono">Active crypto &amp; forex trader</span>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Trades crypto and forex daily. Understands overtrading, hesitation, FOMO, and risk from first-hand experience — not research. Validates every feature against real trading workflows and ensures the product solves genuine trader problems.
            </p>
            <p className="text-[12px] text-muted-foreground/70 leading-relaxed italic">
              &quot;I didn&apos;t want an AI trading bot. I wanted an AI copilot that helps me think clearly.&quot;
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Timeline */}
      <AnimatedSection delay={250}>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border hidden sm:block" />

          <div className="space-y-8 sm:space-y-10">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-5 sm:gap-6">
                {/* Marker */}
                <div className="flex-none hidden sm:flex flex-col items-center">
                  <div className="w-[39px] h-[39px] rounded-xl bg-card border border-border flex items-center justify-center text-[11px] font-mono font-semibold text-muted-foreground/70 tracking-wider z-10">
                    {m.marker}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2 pt-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3 sm:hidden">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground/50 tracking-wider">
                      {m.marker}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground">{m.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
