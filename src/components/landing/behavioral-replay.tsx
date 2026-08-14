"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Play } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

type Phase = {
  chip: { text: string; tone: "amber" | "red" | "green" };
  log: string;
  highlight: number; // timeline index highlighted
};

const PHASES: Phase[] = [
  {
    chip: { text: "Reviewing last trade", tone: "amber" },
    log: "Closed BTC/USD long at −1.2R. Loss logged to journal.",
    highlight: 0,
  },
  {
    chip: { text: "Revenge trade flagged", tone: "red" },
    log: "Immediate re-entry attempted 14s after stop-out. Sizing +50% vs your plan.",
    highlight: 1,
  },
  {
    chip: { text: "Copilot intervention", tone: "amber" },
    log: "Outside your 20-trade discipline pattern. Entry blocked pending review.",
    highlight: 2,
  },
  {
    chip: { text: "Discipline restored", tone: "green" },
    log: "You stepped back. Setup reloaded. Next entry follows your rules.",
    highlight: 3,
  },
];

const TIMELINE = [
  "Loss logged",
  "Revenge attempt",
  "Copilot block",
  "Plan restored",
];

const STEP_MS = 1700;

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

  // Autoplay once when scrolled into view.
  useEffect(() => {
    if (inView) play(0);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const current = PHASES[phase];

  return (
    <section className="tc-section tc-section--wide">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        <div className="lg:col-span-5 space-y-4">
          <span className="tp-eyebrow-mono">03 — Behavioral detection</span>
          <h2 className="tp-h2">
            The copilot catches the trade{" "}
            <span className="tc-accent-phrase">you weren&apos;t going to take back.</span>
          </h2>
          <p className="tp-body max-w-md">
            Revenge trades, sizing spikes, and overtrading are flagged inside the workspace
            before capital is deployed — using the pattern of your last 20 trades, not a
            generic rulebook.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => play(0)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[var(--color-border-default)] text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--color-border-strong)] transition-colors"
            >
              <Play size={13} /> Replay
            </button>
            <button
              onClick={() => {
                stop();
                setPhase(PHASES.length - 1);
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[var(--color-border-default)] text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <RotateCcw size={13} /> Resolve
            </button>
          </div>
        </div>

        <div ref={ref} className="lg:col-span-7">
          <div className="tc-terminal !p-0 overflow-hidden">
            {/* status header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                Trade replay · BTC/USD
              </span>
              <span className={`tc-status-chip tc-status-chip--${current.chip.tone}`}>
                <span className={`tc-status-chip__dot ${phase === 1 ? "tc-status-chip__dot--pulse" : ""}`} />
                {current.chip.text}
              </span>
            </div>

            {/* timeline */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-1.5 mb-4">
                {TIMELINE.map((t, i) => {
                  const active = i <= current.highlight;
                  const tone =
                    i === 1 ? "var(--red)" : i === 3 ? "var(--green)" : "var(--accent)";
                  return (
                    <div key={t} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className="h-1 w-full rounded-full transition-colors duration-500"
                        style={{ backgroundColor: active ? tone : "var(--color-border-default)" }}
                      />
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wide transition-colors duration-300 ${
                          active ? "text-[var(--ink)]" : "text-[var(--muted)]"
                        }`}
                      >
                        {t}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* copilot log */}
              <div className="rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-subtle)] p-3 min-h-[72px] flex items-start gap-2.5">
                <span className="tc-status-chip tc-status-chip--accent mt-0.5 shrink-0">
                  <span className="tc-status-chip__dot" /> Copilot
                </span>
                <p
                key={phase}
                className="tc-reveal in text-[12px] font-mono text-[var(--ink)] leading-relaxed">
                  {current.log}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}