"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Cast,
  TIMING,
  useInViewOnce,
  usePrefersReducedMotion,
  useTypewriter,
} from "./motion";

/* ═══════════════════════════════════════════════════════════════════════
   InstrumentFilm (SEC 03) — "One instrument. Three acts. Zero noise."

   A sticky three-act film bound to scroll progress (3.3). Desktop pins a
   stage and crossfades three acts via scrollYProgress (transform/opacity
   only, scrubs forward AND backward). Mobile degrades to three tap-advance
   cards (state machine, 250ms ease). The single amber for the section is
   the Act II edge light; violet is reserved for the AI caret. Rule-token
   ambient orbit (3.12) drifts desktop-only. The typewriter (3.10) fires
   once when the stage first enters view. Under reduced motion the film
   collapses to a static stack of all three acts (no scrub, no typewriter
   animation — final text shown, no orbit).
   ═══════════════════════════════════════════════════════════════════════ */

const ACT_LABEL = ["ACT I / SETUP", "ACT II / ALERT", "ACT III / AUDIT"] as const;
const ACT_CAPTION = [
  "The note is ready. You write the journal entry.",
  "The pattern is flagged. You decide what it means.",
  "The ledger closes the loop.",
] as const;

const CONSENSUS_CHIPS = [
  "RSI 62.4",
  "MACD cross",
  "EMA 9>21",
  "S/R hold",
  "VOL steady",
] as const;

const RULE_TOKENS = ["REVENGE-TRADING", "COOLDOWN-10M", "POSITION-CAP"] as const;

const JOURNAL_TEXT =
  "you moved your stop — recorded. bias held, size unchanged. lesson: the plan beat the impulse.";

export function InstrumentFilm() {
  const reduced = usePrefersReducedMotion();
  const outerRef = useRef<HTMLDivElement>(null);
  const [stageRef, stageInView] = useInViewOnce<HTMLDivElement>({
    rootMargin: "0px 0px -15% 0px",
  });
  // Mobile/tablet container observer — the desktop stage is display:none
  // below lg so its observer never fires there; this keeps the typewriter
  // (3.10) gated to a element that is actually visible on mobile, so Act III
  // doesn't render an empty journal entry on small screens.
  const [mobileRef, mobileInView] = useInViewOnce<HTMLDivElement>({
    rootMargin: "0px 0px -15% 0px",
  });

  // Mobile tap-advance state machine (0/1/2).
  const [activeAct, setActiveAct] = useState(0);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  /* ── Act crossfades (opacity + translateY, scrubs both directions) ── */
  const act1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.38], [1, 1, 0]);
  const act1Y = useTransform(scrollYProgress, [0, 0.38], [0, -16]);
  const act2Opacity = useTransform(
    scrollYProgress,
    [0.3, 0.4, 0.6, 0.7],
    [0, 1, 1, 0]
  );
  const act2Y = useTransform(scrollYProgress, [0.3, 0.4, 0.6, 0.7], [16, 0, 0, -16]);
  const act3Opacity = useTransform(scrollYProgress, [0.62, 0.72, 1], [0, 1, 1]);
  const act3Y = useTransform(scrollYProgress, [0.62, 0.72, 1], [16, 0, 0]);

  /* ── Progress rail (3 segments, scaleX origin left) ── */
  const seg1 = useTransform(scrollYProgress, [0, 0.34], [0, 1]);
  const seg2 = useTransform(scrollYProgress, [0.34, 0.67], [0, 1]);
  const seg3 = useTransform(scrollYProgress, [0.67, 1], [0, 1]);

  /* ── Act label index for the sticky eyebrow ── */
  const [labelIdx, setLabelIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = v < 0.34 ? 0 : v < 0.67 ? 1 : 2;
    setLabelIdx((prev) => (prev === i ? prev : i));
  });

  /* ── Typewriter: one pass, gated by whichever stage is visible ── */
  const typed = useTypewriter(
    JOURNAL_TEXT,
    stageInView || mobileInView,
    "instrument-film-audit"
  );

  /* ── Act content blocks (shared across desktop / mobile / reduced) ── */
  const actBody = (i: number) => {
    if (i === 0) {
      return (
        <div className="v2-card-flat v2-zone w-full p-5 md:p-6">
          <div className="v2-mono v2-data flex items-center gap-2 text-[13px]">
            <span>compiling consensus</span>
            <span className="v2-caret" aria-hidden="true" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CONSENSUS_CHIPS.map((c) => (
              <span key={c} className="v2-chip v2-data">
                {c}
              </span>
            ))}
          </div>
          <p className="v2-mono v2-muted mt-5 text-[12px] leading-relaxed">
            {ACT_CAPTION[0]}
          </p>
        </div>
      );
    }
    if (i === 1) {
      // The single amber for the section: a 2px amber edge light on the alert.
      return (
        <div
          className="v2-card-flat v2-zone w-full p-5 md:p-6"
          style={{ borderLeft: "2px solid var(--amber)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="v2-mono v2-data text-[13px] font-semibold">
              ENTRY ACTIVE — do not chase
            </span>
            <span className="v2-mono v2-muted text-[11px]">14:32:08 EDT</span>
          </div>
          <p className="v2-mono v2-muted mt-5 text-[12px] leading-relaxed">
            {ACT_CAPTION[1]}
          </p>
        </div>
      );
    }
    // Act III — audit: terminal block with the self-writing journal entry.
    return (
      <div className="v2-card-flat v2-zone w-full p-5 md:p-6">
        <div className="v2-mono v2-data text-[13px] leading-relaxed">
          <span className="v2-muted select-none">&gt; </span>
          {typed}
          <span className="v2-caret" aria-hidden="true" />
        </div>
        <p className="v2-mono v2-muted mt-5 text-[12px] leading-relaxed">
          {ACT_CAPTION[2]}
        </p>
      </div>
    );
  };

  /* ── Reduced motion: static stack of all three acts, no scrub/orbit ── */
  if (reduced) {
    return (
      <section id="features" className="v2-section v2-aurora v2-aurora-ai v2-fold">
        <Cast kind="ai">
          <div className="v2-shell">
            <header className="max-w-2xl">
              <p className="v2-eyebrow">SPEC 03 / THE INSTRUMENT</p>
              <h2 className="v2-h2 mt-3">One instrument. Three acts. Zero noise.</h2>
            </header>
            <div className="mt-10 grid gap-4">
              {ACT_LABEL.map((label, i) => (
                <div key={label}>
                  <p className="v2-eyebrow mb-2">{label}</p>
                  {actBody(i)}
                </div>
              ))}
            </div>
          </div>
        </Cast>
      </section>
    );
  }

  return (
    <section id="features" className="v2-section v2-aurora v2-aurora-ai v2-fold">
      <Cast kind="ai">
        <div className="v2-shell">
          <header className="max-w-2xl">
            <p className="v2-eyebrow">SPEC 03 / THE INSTRUMENT</p>
            <h2 className="v2-h2 mt-3">One instrument. Three acts. Zero noise.</h2>
          </header>

          {/* ── Desktop: sticky scroll-scrubbed film (lg+) ── */}
          <div ref={outerRef} className="hidden lg:block lg:h-[260vh]">
            <div className="lg:sticky lg:top-24">
              <div
                ref={stageRef}
                className="v2-zone relative mx-auto h-[480px] w-full max-w-3xl overflow-hidden rounded-lg"
                style={{
                  background: "var(--bg-surface-1)",
                  border: "1px solid var(--hairline)",
                }}
              >
                {/* Act label eyebrow (top of stage) */}
                <div className="absolute left-5 right-5 top-4 z-20 flex items-center justify-between">
                  <span className="v2-eyebrow" aria-live="polite">
                    {ACT_LABEL[labelIdx]}
                  </span>
                  <span className="v2-mono v2-muted text-[10px]">
                    {String(labelIdx + 1).padStart(2, "0")} / 03
                  </span>
                </div>

                {/* Rule-token ambient orbit (desktop only, 3.12) */}
                {RULE_TOKENS.map((t, i) => (
                  <span
                    key={t}
                    className="v2-orbit v2-chip pointer-events-auto absolute z-10"
                    style={{
                      top: `${18 + i * 22}%`,
                      left: i % 2 === 0 ? "6%" : "auto",
                      right: i % 2 === 1 ? "6%" : "auto",
                      animationDelay: `${i * -3.3}s`,
                    }}
                  >
                    {t}
                  </span>
                ))}

                {/* Act stages (absolutely positioned, crossfade via scroll) */}
                <div className="absolute inset-0 flex items-center justify-center px-6 pt-16 pb-16">
                  <div className="relative w-full max-w-xl">
                    <motion.div
                      className="absolute inset-0"
                      style={{ opacity: act1Opacity, y: act1Y }}
                    >
                      {actBody(0)}
                    </motion.div>
                    <motion.div
                      className="absolute inset-0"
                      style={{ opacity: act2Opacity, y: act2Y }}
                    >
                      {actBody(1)}
                    </motion.div>
                    <motion.div
                      className="absolute inset-0"
                      style={{ opacity: act3Opacity, y: act3Y }}
                    >
                      {actBody(2)}
                    </motion.div>
                  </div>
                </div>

                {/* Progress rail (3 segments, scaleX origin left) */}
                <div className="absolute bottom-5 left-5 right-5 z-20 flex gap-2">
                  {[seg1, seg2, seg3].map((seg, i) => (
                    <div
                      key={i}
                      className="h-px flex-1 overflow-hidden"
                      style={{ background: "var(--hairline)" }}
                    >
                      <motion.div
                        className="h-full w-full"
                        style={{
                          scaleX: seg,
                          transformOrigin: "left",
                          background: "var(--text-secondary)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile / tablet: three tap-advance cards (< lg) ── */}
          <div ref={mobileRef} className="lg:hidden">
            <div className="flex items-center justify-between">
              <span className="v2-eyebrow">{ACT_LABEL[activeAct]}</span>
              <span className="v2-mono v2-muted text-[10px]">
                {String(activeAct + 1).padStart(2, "0")} / 03
              </span>
            </div>

            <div
              className="relative mt-4 cursor-pointer select-none"
              onClick={() => setActiveAct((a) => (a + 1) % 3)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveAct((a) => (a + 1) % 3);
                }
              }}
              aria-label={`Show next act (act ${activeAct + 1} of 3)`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAct}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: TIMING.toggle / 1000, ease: "easeInOut" }}
                >
                  {actBody(activeAct)}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tap hint + segment dots */}
            <div className="mt-4 flex items-center justify-between">
              <span className="v2-mono v2-muted text-[10px]">tap to advance</span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        i === activeAct ? "var(--text-primary)" : "var(--hairline)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Cast>
    </section>
  );
}