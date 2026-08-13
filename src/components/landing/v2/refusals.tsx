"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Refusals (SEC 05) — positioning section for the v2 homepage.

   Replaces the old comparison table vs TradingView/ChatGPT. Four parts:
     A. "WHAT WE REFUSE TO DO" mono table (NEVER / see SPEC 07)
     B. Three problem cards (Unsupervised Execution / Recovery Spirals / Invisible Drift)
     C. git-diff comparison (3.5) — progressive line reveal, fires once
     D. Four-axis Alone <-> Watched toggle (3.6) — 400ms ease-in-out slide

   All animation uses transform/opacity only. Diff reveal + toggle gated
   behind useInViewOnce. Reduced-motion shows final static state (toggle
   still works, instant). Root: market aurora + market cast.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, type CSSProperties } from "react";
import {
  Reveal,
  Cast,
  useInViewOnce,
  usePrefersReducedMotion,
  TIMING,
} from "./motion";

/* ── Part A — refusals table ────────────────────────────────────────── */
const REFUSALS: { act: string; verdict: string; link?: boolean }[] = [
  { act: "execute trades", verdict: "NEVER" },
  { act: "touch your funds", verdict: "NEVER" },
  { act: "send hype alerts", verdict: "NEVER" },
  { act: "hide our methods", verdict: "see SPEC 07", link: true },
];

/* ── Part B — three problems ───────────────────────────────────────── */
const PROBLEMS: { title: string; scene: string }[] = [
  {
    title: "Unsupervised Execution",
    scene:
      "You size up after a loss because no one is watching. The trade hits your stop in 90 seconds.",
  },
  {
    title: "Recovery Spirals",
    scene:
      "One bad trade becomes three. You make it back until you do not. The spiral is the strategy now.",
  },
  {
    title: "Invisible Drift",
    scene:
      "Your win rate slips 8% over a month. You do not notice because nothing is logging the pattern.",
  },
];

/* ── Part C — git-diff lines ───────────────────────────────────────── */
const DIFF_MINUS = [
  "revenge trade at 2:41 PM",
  "moved stop down to give it room",
  "sized up 3x on a hunch",
];
const DIFF_PLUS = [
  "circuit-breaker note sent at 2:41 PM",
  "stop-move logged with reason field",
  "sizing flag: 3x baseline — review required",
];

/* ── Part D — four axes ────────────────────────────────────────────── */
const AXES: { label: string; alone: string; watched: string }[] = [
  { label: "P&L visibility", alone: "manual spreadsheet", watched: "auto-logged per trade" },
  { label: "Impulse control", alone: "willpower alone", watched: "circuit-breaker notes" },
  { label: "Post-trade review", alone: "if you remember", watched: "journal with memory" },
  { label: "Accountability", alone: "to yourself", watched: "to your own rules, surfaced" },
];

/* ═══════════════════════════════════════════════════════════════════════
   Refusals
   ═══════════════════════════════════════════════════════════════════════ */
export function Refusals() {
  const reduced = usePrefersReducedMotion();

  /* Part C — diff reveal, fires once on first in-view */
  const [diffRef, diffInView] = useInViewOnce<HTMLDivElement>();
  const diffShown = reduced || diffInView;

  /* Part D — toggle, gated behind in-view but always interactive */
  const [toggleRef, toggleInView] = useInViewOnce<HTMLDivElement>();
  const [watched, setWatched] = useState(false);
  const toggleActive = reduced || toggleInView;
  const toggleMs = reduced ? 0 : TIMING.toggle;

  /* Thumb geometry: fixed 50% width at left:3px, slides via transform only
     (transform/opacity hard rule 4.1). translateX(100%) shifts by the thumb's
     own width → lands at 50%, matching the watched option. */
  const thumbStyle: CSSProperties = {
    left: "3px",
    width: "calc(50% - 3px)",
    transform: watched ? "translateX(100%)" : "translateX(0)",
    transition: toggleActive
      ? `transform ${toggleMs}ms ease-in-out`
      : "none",
  };

  return (
    <section
      id="refusals"
      className="v2-section v2-aurora v2-aurora-market v2-fold"
    >
      <Cast kind="market">
        <div className="v2-shell flex flex-col gap-16">
          {/* ── PART A — WHAT WE REFUSE TO DO ─────────────────────────── */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="v2-eyebrow v2-muted">THE COMMITMENT</span>
              <h2 className="v2-h2 v2-fg">What we refuse to do</h2>
            </div>

            <Reveal>
              <div className="v2-card-flat v2-mono text-[13px]">
                {REFUSALS.map((r, i) => (
                  <Reveal key={r.act} delay={i * TIMING.revealStagger}>
                    <div
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
                      style={{ borderBottom: "1px solid var(--hairline)" }}
                    >
                      <span className="v2-fg">{r.act}</span>
                      {r.link ? (
                        <a
                          href="#prospectus"
                          className="v2-link v2-muted"
                        >
                          {r.verdict}
                        </a>
                      ) : (
                        <span className="v2-data">{r.verdict}</span>
                      )}
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </div>

          {/* ── PART B — Three problems ──────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <span className="v2-eyebrow v2-muted">THE PROBLEMS</span>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p.title} delay={i * TIMING.revealStagger}>
                  <div className="v2-card h-full p-5">
                    <h3 className="v2-fg text-[15px] font-semibold">
                      {p.title}
                    </h3>
                    <p className="v2-body v2-muted mt-2 text-[13px] leading-relaxed">
                      {p.scene}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── PART C — git-diff comparison ─────────────────────────── */}
          <div ref={diffRef} className="flex flex-col gap-4">
            <div className="v2-card-flat v2-mono overflow-hidden text-[12px]">
              <div
                className="px-4 py-2 v2-muted"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                WHAT YOU MISSED LAST MONTH
              </div>
              {DIFF_MINUS.map((line, i) => (
                <DiffLine
                  key={`m-${i}`}
                  kind="minus"
                  index={i}
                  shown={diffShown}
                  reduced={reduced}
                >
                  {`- ${line}`}
                </DiffLine>
              ))}
              <div
                className="px-4 py-2 v2-muted"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                WHAT THE COPILOT CATCHES
              </div>
              {DIFF_PLUS.map((line, i) => (
                <DiffLine
                  key={`p-${i}`}
                  kind="plus"
                  index={DIFF_MINUS.length + i}
                  shown={diffShown}
                  reduced={reduced}
                >
                  {`+ ${line}`}
                </DiffLine>
              ))}
            </div>
          </div>

          {/* ── PART D — four-axis comparison toggle ──────────────────── */}
          <div ref={toggleRef} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <span className="v2-eyebrow v2-muted">THE DIFFERENCE</span>
                <h3 className="v2-h2 v2-fg">Alone vs. watched</h3>
              </div>

              {/* Toggle control */}
              <div
                className="v2-toggle"
                role="group"
                aria-label="Alone versus watched"
              >
                <span
                  className="v2-toggle-thumb"
                  style={thumbStyle}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="v2-toggle-opt"
                  data-active={!watched}
                  aria-pressed={!watched}
                  onClick={() => setWatched(false)}
                >
                  ALONE
                </button>
                <button
                  type="button"
                  className="v2-toggle-opt"
                  data-active={watched}
                  aria-pressed={watched}
                  onClick={() => setWatched(true)}
                >
                  WATCHED
                </button>
              </div>
            </div>

            <div className="v2-card-flat divide-y" style={{ borderColor: "var(--hairline)" }}>
              {AXES.map((a) => (
                <div
                  key={a.label}
                  className="grid grid-cols-1 items-center gap-2 px-4 py-4 md:grid-cols-[1fr_auto]"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  <span className="v2-mono text-[12px] v2-muted">
                    {a.label}
                  </span>
                  <CrossfadeValue
                    alone={a.alone}
                    watched={a.watched}
                    watchedState={watched}
                    ms={toggleMs}
                    active={toggleActive}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Cast>
    </section>
  );
}

/* ── Diff line (3.5): progressive reveal, 150ms ease, 60ms stagger ──── */
function DiffLine({
  kind,
  index,
  shown,
  reduced,
  children,
}: {
  kind: "minus" | "plus";
  index: number;
  shown: boolean;
  reduced: boolean;
  children: string;
}) {
  const cls = kind === "minus" ? "v2-diff-minus" : "v2-diff-plus";
  const style: CSSProperties = reduced
    ? {}
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateX(-6px)",
        transition: "opacity 150ms ease, transform 150ms ease",
        transitionDelay: `${index * 60}ms`,
      };
  return (
    <div className={`${cls} px-4 py-1.5`} style={style}>
      {children}
    </div>
  );
}

/* ── Crossfade value (3.6): opacity/translateX, 400ms ease-in-out ───── */
function CrossfadeValue({
  alone,
  watched,
  watchedState,
  ms,
  active,
}: {
  alone: string;
  watched: string;
  watchedState: boolean;
  ms: number;
  active: boolean;
}) {
  const transition = active
    ? `opacity ${ms}ms ease-in-out, transform ${ms}ms ease-in-out`
    : "none";

  const aloneStyle: CSSProperties = {
    opacity: watchedState ? 0 : 1,
    transform: watchedState ? "translateX(6px)" : "none",
    transition,
  };
  const watchedStyle: CSSProperties = {
    opacity: watchedState ? 1 : 0,
    transform: watchedState ? "none" : "translateX(-6px)",
    transition,
  };

  return (
    <span className="relative inline-block min-w-[8rem] text-right">
      <span
        className="v2-mono text-[13px] v2-data absolute right-0 top-0"
        style={aloneStyle}
        aria-hidden={watchedState}
      >
        {alone}
      </span>
      <span
        className="v2-mono text-[13px] v2-data absolute right-0 top-0"
        style={watchedStyle}
        aria-hidden={!watchedState}
      >
        {watched}
      </span>
      {/* spacer to size the container to the longer of the two values */}
      <span className="v2-mono text-[13px] v2-data invisible">
        {alone.length >= watched.length ? alone : watched}
      </span>
    </span>
  );
}