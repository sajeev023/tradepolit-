"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Play, ShieldAlert, CheckCircle2, History, Scale } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

type Phase = {
  step: string;
  time: string;
  chip: { text: string; tone: "amber" | "red" | "green" | "accent" };
  log: string;
  ruleFired: string;
  patternMatched: string;
  rSaved: string;
  highlight: number;
};

const PHASES: Phase[] = [
  {
    step: "Loss logged",
    time: "14:22:04 UTC",
    chip: { text: "Reviewing last trade", tone: "amber" },
    log: "Closed BTC/USD long at −1.2R after invalidation at $66,420. Loss automatically logged to journal with emotional baseline tag: NEUTRAL.",
    ruleFired: "STOP_LOSS_HIT · Disciplined Exit",
    patternMatched: "Baseline risk: 1st loss in current session (Historical win rate 68%)",
    rSaved: "0.0R (Stop-loss respected)",
    highlight: 0,
  },
  {
    step: "Revenge attempt",
    time: "14:22:18 UTC (+14s)",
    chip: { text: "Revenge trade flagged", tone: "red" },
    log: "Immediate market re-entry attempted 14 seconds after stop-out. Position sizing is +50% above your declared max risk (1.5% vs 1.0% plan limit).",
    ruleFired: "RAPID_REENTRY & SIZING_ANOMALY",
    patternMatched: "Historical re-entries <60s after stop-out fail 82% of the time with −2.4R mean drawdown",
    rSaved: "Intervention triggered",
    highlight: 1,
  },
  {
    step: "Copilot block",
    time: "14:22:19 UTC",
    chip: { text: "Copilot intervention", tone: "amber" },
    log: "Outside your 20-trade discipline pattern. Entry blocked pending a 5-minute cooldown and structural setup review.",
    ruleFired: "GUARDRAIL_INTERVENTION · Soft Lock",
    patternMatched: "Discipline rule #2: Mandatory 5m pause required after unplanned sizing spike",
    rSaved: "+1.8R capital preserved",
    highlight: 2,
  },
  {
    step: "Plan restored",
    time: "14:27:30 UTC (+5m)",
    chip: { text: "Discipline restored", tone: "green" },
    log: "Trader paused and reviewed checklist. Fresh setup compiled on genuine 4h support bounce. Next entry follows your rules.",
    ruleFired: "CHECKLIST_SATISFIED · Standard Risk",
    patternMatched: "A+ pullback setup aligned with 4h trend structure and 1.0% standard sizing",
    rSaved: "+1.8R drawdown avoided",
    highlight: 3,
  },
];

const TIMELINE = [
  "Loss logged",
  "Revenge attempt",
  "Copilot block",
  "Plan restored",
];

const STEP_MS = 2200;

export function BehavioralReplay() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const stop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const play = (from = 0) => {
    stop();
    setPhase(from);
    if (reduced) {
      setPhase(PHASES.length - 1);
      return;
    }
    let i = from;
    const advance = () => {
      i += 1;
      if (i >= PHASES.length) {
        setPhase(PHASES.length - 1);
        return;
      }
      setPhase(i);
      timerRef.current = setTimeout(advance, STEP_MS);
    };
    timerRef.current = setTimeout(advance, STEP_MS);
  };

  // Autoplay once when scrolled into view
  useEffect(() => {
    if (inView) play(0);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const current = PHASES[phase];

  return (
    <section className="tc-section tc-section--wide">
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          <span className="tp-eyebrow-mono">03 / DISCIPLINE</span>
          <h2 className="tp-h2">
            Automated guardrails against emotional trading
          </h2>
          <p className="tp-body max-w-md">
            Position sizing anomalies, rapid re-entries, and revenge trades are flagged inside the workspace before capital is deployed based on your declared discipline rules.
          </p>
          <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              onClick={() => play(0)}
              className="inline-flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-4 sm:px-5 rounded-lg border border-[var(--color-border-default)] text-[12px] sm:text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--color-border-strong)] transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Play size={12} /> Replay
            </button>
            <button
              onClick={() => {
                stop();
                setPhase(PHASES.length - 1);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-4 sm:px-5 rounded-lg border border-[var(--color-border-default)] text-[12px] sm:text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <RotateCcw size={12} /> Resolve
            </button>
          </div>
          <p className="text-[10px] sm:text-[11px] font-mono text-[var(--muted)] pt-0.5 sm:pt-1">
            Illustrative replay — based on real guardrail behavior.
          </p>
        </div>

        <div ref={ref} className="lg:col-span-7">
          <div className="tc-terminal !p-0 overflow-hidden">
            {/* Header: title + timestamp + status */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 border-b border-[var(--color-border-subtle)] bg-[var(--bg-band)]">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--ink)] font-semibold">
                  Behavioral Guardrail
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[var(--muted)]">·</span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[var(--muted)] tabular-nums">
                  {current.time}
                </span>
              </div>

              <span className={`tc-status-chip tc-status-chip--${current.chip.tone} text-[11px]`}>
                <span className={`tc-status-chip__dot ${phase === 1 ? "tc-status-chip__dot--pulse" : ""}`} />
                {current.chip.text}
              </span>
            </div>

            {/* Timeline progress bar */}
            <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {TIMELINE.map((t, i) => {
                  const active = i <= current.highlight;
                  const isCurrent = i === current.highlight;
                  const tone =
                    i === 1 ? "var(--red)" : i === 3 ? "var(--green)" : "var(--accent)";
                  return (
                    <div key={t} className="flex-1 flex flex-col items-center gap-1 sm:gap-1.5">
                      <div
                        className="h-1 sm:h-1.5 w-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: active ? tone : "var(--color-border-default)",
                          boxShadow: isCurrent ? `0 0 8px ${tone}` : "none",
                        }}
                      />
                      <span
                        className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-wider transition-colors duration-300 ${
                          isCurrent
                            ? "text-[var(--ink)] font-bold"
                            : active
                            ? "text-[var(--ink)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {t}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Copilot log message */}
              <div className="rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-subtle)] p-2.5 sm:p-3.5 flex items-start gap-2.5 sm:gap-3">
                <span className="tc-status-chip tc-status-chip--accent mt-0.5 shrink-0 text-[11px]">
                  <span className="tc-status-chip__dot" /> Copilot
                </span>
                <p
                  key={phase}
                  className="tc-reveal in text-[11px] sm:text-[12px] font-mono text-[var(--ink)] leading-relaxed flex-1"
                >
                  {current.log}
                </p>
              </div>

              {/* Reasoning trace panel */}
              <div className="rounded-lg bg-[var(--surface)] border border-[var(--color-border-subtle)] p-2.5 sm:p-3.5 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-[var(--color-border-subtle)]">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] font-semibold flex items-center gap-1.5">
                    <History size={11} className="text-[var(--accent)]" /> Guardrail Reasoning Trace
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-[var(--muted)]">
                    Step {phase + 1} of 4
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono">
                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--muted)] block">Rule Fired</span>
                    <span className="text-[10px] sm:text-[11px] text-[var(--ink)] font-medium leading-tight block">
                      {current.ruleFired}
                    </span>
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--muted)] block">20-Trade Pattern</span>
                    <span className="text-[10px] sm:text-[11px] text-[var(--muted)] leading-tight block">
                      {current.patternMatched}
                    </span>
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--muted)] block">Capital Preserved</span>
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold leading-tight block ${
                        current.rSaved.includes("+") ? "text-[var(--green)]" : "text-[var(--ink)]"
                      }`}
                    >
                      {current.rSaved}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}