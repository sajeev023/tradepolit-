"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { Database, Waves, Gauge, Brain, Target, type LucideIcon } from "lucide-react";
import { LivePrice } from "./live-price";

/* ═══════════════════════════════════════════════════════════════════════
   IntelligencePipeline — the signature "wow" section.

   As the user scrolls, raw market data visibly compiles through five
   stages into a convicted thesis. Scroll is the "compute." Driven by
   framer-motion useScroll (no GSAP pin → no Lenis jank). Real live BTC
   price feeds stage 1; everything synthetic is labelled illustrative.
   Reduced-motion: all stages render resolved, no scrub/pin.
   ═══════════════════════════════════════════════════════════════════════ */

interface Stage {
  index: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  artifact: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    index: "01",
    icon: Database,
    label: "Market Data",
    sub: "Live Binance WS tick stream",
    artifact: (
      <div className="flex items-center gap-2">
        <span className="ping-dot" />
        <LivePrice symbol="BTC/USD" sizeClass="text-[11px]" />
      </div>
    ),
  },
  {
    index: "02",
    icon: Waves,
    label: "Indicators",
    sub: "RSI · MACD · EMA9/21 · S/R · Volume",
    artifact: (
      <div className="flex flex-wrap gap-1.5">
        {[
          ["RSI", "62.4"],
          ["MACD", "cross"],
          ["EMA", "9>21"],
          ["S/R", "hold"],
        ].map(([k, v]) => (
          <span key={k} className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
            {k} <span className="text-[var(--color-accent-primary)]">{v}</span>
          </span>
        ))}
      </div>
    ),
  },
  {
    index: "03",
    icon: Gauge,
    label: "Behavioral Context",
    sub: "Your last 20 trades · journal memory",
    artifact: (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: "var(--color-warning)", background: "var(--color-warning-bg)", border: "1px solid rgba(245,158,11,0.2)" }}>
          revenge pattern · flagged
        </span>
        <span className="tp-micro-label !text-[8px]">illustrative</span>
      </div>
    ),
  },
  {
    index: "04",
    icon: Brain,
    label: "Bias Engine",
    sub: "Multi-signal reasoning → conviction",
    artifact: (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-[var(--color-profit)]">BULLISH</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1 rounded-full bg-[var(--color-border-default)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "88%", background: "linear-gradient(90deg,#22d3ee,#10b981)" }} />
          </div>
          <span className="font-mono text-[9px] text-[var(--color-text-secondary)]">88%</span>
        </div>
      </div>
    ),
  },
  {
    index: "05",
    icon: Target,
    label: "Actionable Insight",
    sub: "Entry · stop · target · invalidation",
    artifact: (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px]">
        <span className="text-[var(--color-text-tertiary)]">ENTRY</span><span className="text-[var(--color-text-primary)] font-semibold">$92.8k</span>
        <span className="text-[var(--color-text-tertiary)]">SL</span><span className="text-[var(--color-loss)] font-semibold">$91.4k</span>
        <span className="text-[var(--color-text-tertiary)]">TP</span><span className="text-[var(--color-profit)] font-semibold">$95.6k</span>
        <span className="tp-micro-label !text-[8px]">illustrative</span>
      </div>
    ),
  },
];

function StageNode({ stage, active, last: _last = false }: { stage: Stage; active: boolean; last?: boolean }) {
  const Icon = stage.icon;
  return (
    <div className="flex flex-col items-center text-center relative" style={{ minWidth: 0, flex: "1 1 0" }}>
      {/* Node card */}
      <div
        className="pipeline-node card w-full px-3 py-3 flex flex-col items-center gap-2"
        data-active={active}
        style={{ opacity: active ? 1 : 0.42, transitionDelay: "60ms" }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{
            background: active ? "var(--color-accent-primary-subtle)" : "var(--color-bg-secondary)",
            border: `1px solid ${active ? "rgba(6,182,212,0.25)" : "var(--color-border-default)"}`,
            color: active ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
          }}
        >
          <Icon size={16} />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-tight">{stage.label}</div>
          <div className="tp-micro-label !text-[8px] mt-0.5">{stage.sub}</div>
        </div>
      </div>

      {/* Data artifact — fades in when active */}
      <motion.div
        initial={false}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : 6, height: active ? "auto" : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden mt-2 min-w-0 w-full flex justify-center"
      >
        <div className="px-1">{stage.artifact}</div>
      </motion.div>
    </div>
  );
}

export function IntelligencePipeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.8", "end 0.55"],
  });

  // Desktop scrub: how many stages are "active" at this scroll point.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const count = Math.min(STAGES.length, Math.floor(p * STAGES.length) + (p > 0 ? 1 : 0));
    setActiveCount(Math.max(0, Math.min(STAGES.length, count)));
  });

  const conduitScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Reduced motion: everything resolved.
  const resolvedCount = reduced ? STAGES.length : activeCount;

  return (
    <section id="intelligence" className="relative" style={{ scrollMarginTop: "96px" }}>
      {/* Tall scrub range on desktop so the sticky pipeline stays on screen.
          On mobile we collapse to natural height (no sticky). */}
      <div ref={sectionRef} className="lg:h-[170vh]">
        <div className="lg:sticky lg:top-24 flex flex-col justify-center">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 w-full">
            {/* Header */}
            <div className="text-center space-y-3 mb-10 lg:mb-14">
              <span className="chapter-chip"><span className="ping-dot" /> CH.06 · THE INTELLIGENCE</span>
              <h2 className="tp-display text-[var(--color-text-primary)] glow-text">
                You&apos;re not looking at a chart. You&apos;re reading a thesis.
              </h2>
              <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-xl mx-auto leading-relaxed">
                TradCopilot isn&apos;t a chatbot beside a chart. It&apos;s an intelligence layer — raw market data compiled through indicators, your own trade history, and multi-signal reasoning into one convicted, risk-bounded insight.
              </p>
            </div>

            {/* Pipeline */}
            <div className="relative">
              {/* Desktop: horizontal conduit */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* track */}
                  <div className="absolute left-0 right-0 top-[42px] h-px bg-[var(--color-border-default)]" />
                  {/* drawn fill */}
                  <motion.div
                    style={{ scaleX: reduced ? 1 : conduitScaleX, transformOrigin: "left center" }}
                    className="absolute left-0 right-0 top-[42px] h-px"
                  >
                    <div className="h-full w-full" style={{ background: "linear-gradient(90deg, transparent, var(--color-accent-primary), var(--color-accent-primary))", boxShadow: "0 0 10px rgba(6,182,212,0.6)" }} />
                  </motion.div>
                  <div className="flex gap-3 relative">
                    {STAGES.map((s, i) => (
                      <StageNode key={s.index} stage={s} active={resolvedCount > i} last={i === STAGES.length - 1} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile: vertical stack with vertical conduit */}
              <div className="lg:hidden relative pl-6">
                <div className="absolute left-[14px] top-2 bottom-2 w-px bg-[var(--color-border-default)]" />
                <motion.div
                  style={{ scaleY: reduced ? 1 : conduitScaleX, transformOrigin: "top center" }}
                  className="absolute left-[14px] top-2 bottom-2 w-px"
                >
                  <div className="h-full w-full" style={{ background: "linear-gradient(180deg, var(--color-accent-primary), rgba(6,182,212,0.2))", boxShadow: "0 0 8px rgba(6,182,212,0.5)" }} />
                </motion.div>
                <div className="flex flex-col gap-4">
                  {STAGES.map((s, i) => (
                    <div key={s.index} className="relative">
                      <div
                        className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          background: resolvedCount > i ? "var(--color-accent-primary)" : "var(--background)",
                          borderColor: resolvedCount > i ? "var(--color-accent-primary)" : "var(--color-border-strong)",
                          boxShadow: resolvedCount > i ? "0 0 10px rgba(6,182,212,0.6)" : "none",
                        }}
                      />
                      <StageNode stage={s} active={resolvedCount > i} last={i === STAGES.length - 1} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[var(--color-text-quaternary)] mt-8 text-center font-mono">
              market data: live · indicators &amp; insights: illustrative demonstration of the pipeline
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}