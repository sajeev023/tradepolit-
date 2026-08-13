"use client";

/* ═══════════════════════════════════════════════════════════════════════
   DisciplineTheater (SEC 02) — the before/after "discipline theater".

   A tall pin range (lg:h-[200vh]) holds a sticky stage. As the user
   scrolls, the crowded "typical trader desktop" on the left flickers
   faster and slides off-screen while the clean TradCopilot readout on
   the right settles into focus. Scroll progress drives everything via
   framer-motion useScroll/useTransform (transform/opacity only).

   Mobile: no sticky / no scroll film — two stacked static cards with a
   Reveal. Reduced-motion: both panels render resolved and static so the
   comparison is visible without motion.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Cast, Reveal, useInViewLive, usePrefersReducedMotion } from "./motion";

/* ── The 14 indicators on the crowded desktop (desaturated, no amber) ── */
const INDICATORS: { k: string; v: string }[] = [
  { k: "RSI", v: "62" },
  { k: "MACD", v: "↑" },
  { k: "EMA9", v: "20,401" },
  { k: "EMA21", v: "20,388" },
  { k: "ATR", v: "187" },
  { k: "BB", v: "w" },
  { k: "STOCH", v: "78" },
  { k: "OBV", v: "+" },
  { k: "VWAP", v: "20,412" },
  { k: "ICH", v: "bull" },
  { k: "FIB", v: ".618" },
  { k: "PIVOT", v: "R1" },
  { k: "ADX", v: "31" },
  { k: "CCI", v: "142" },
];

const CHART_TABS = ["1m", "5m", "15m"];

const SIGNAL_LINES = [
  { who: "ape_x", txt: "entry here???" },
  { who: "mk", txt: "send it bro" },
  { who: "degen", txt: "all in 10x" },
];

const CALL_LINES = [
  { who: "alpha_bot", txt: "GOLDEN SIGNAL 🔥🔥" },
  { who: "newbie", txt: "what tp??" },
  { who: "shill", txt: "this is the one" },
];

/* ── Left panel: the crowded, desaturated trader desktop ── */
function CrowdedDesktop({ flicker }: { flicker: number }) {
  // flicker is 0..1 — drives an opacity oscillation cadence that speeds
  // up with scroll progress. We render an inline style whose opacity is
  // a function of flicker; the motion is driven by the parent's motion
  // value via a styled span, not by a runtime width/height animation.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--bg-surface-1)] p-3 md:p-4">
      {/* top bar: chart tabs + frozen cursor tag */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {CHART_TABS.map((t, i) => (
            <span
              key={t}
              className={`v2-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-[var(--hairline)] ${
                i === 1 ? "v2-muted" : "v2-data"
              }`}
              style={i === 1 ? { background: "var(--bg-surface-2)" } : undefined}
            >
              {t}
            </span>
          ))}
        </div>
        <span className="v2-mono text-[9px] v2-muted flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full border border-[var(--hairline)]"
            style={{ background: "var(--bg-surface-2)" }}
          />
          cursor frozen
        </span>
      </div>

      {/* indicator grid — 14 chips, crowded */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 md:grid-cols-7">
        {INDICATORS.map((ind) => (
          <span
            key={ind.k}
            className="v2-mono text-[9px] px-1.5 py-1 rounded-sm border border-[var(--hairline)] bg-[var(--bg-surface-2)] v2-data truncate"
            style={{ opacity: 0.55 + flicker * 0.45 }}
          >
            {ind.k} <span className="v2-muted">{ind.v}</span>
          </span>
        ))}
      </div>

      {/* fake chart block */}
      <div
        className="mt-3 h-20 rounded-sm border border-[var(--hairline)] bg-[var(--bg-surface-2)] md:h-24"
        style={{ opacity: 0.5 + flicker * 0.5 }}
      >
        <div className="flex h-full items-end gap-1 px-2 pb-2">
          {[12, 28, 18, 34, 22, 40, 30, 26, 38, 20, 32, 24].map((h, i) => (
            <span
              key={i}
              className="inline-block w-1.5 v2-muted"
              style={{
                height: `${h}px`,
                background: "var(--text-secondary)",
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>

      {/* two discord-like windows */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { title: "#signals", lines: SIGNAL_LINES },
          { title: "#spoon-fed-calls", lines: CALL_LINES },
        ].map((win) => (
          <div
            key={win.title}
            className="rounded-sm border border-[var(--hairline)] bg-[var(--bg-surface-2)] p-1.5"
            style={{ opacity: 0.6 + flicker * 0.4 }}
          >
            <div className="v2-mono text-[9px] v2-muted border-b border-[var(--hairline)] pb-1">
              {win.title}
            </div>
            <div className="mt-1 space-y-0.5">
              {win.lines.map((l, i) => (
                <div key={i} className="v2-mono text-[8px] leading-tight truncate">
                  <span className="v2-muted">{l.who}:</span>{" "}
                  <span className="v2-data">{l.txt}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* floating red P&L badge */}
      <div
        className="absolute right-3 top-3 v2-mono text-[11px] px-2 py-1 rounded-sm border v2-diff-minus"
        style={{ opacity: 0.7 + flicker * 0.3 }}
      >
        − $1,240.50
      </div>
    </div>
  );
}

/* ── Right panel: the same moment inside TradCopilot (clean) ── */
function CleanReadout() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--bg-surface-1)] p-4 md:p-6">
      {/* eyebrow row */}
      <div className="flex items-center justify-between">
        <span className="v2-eyebrow v2-muted">BTC/USD · 4H</span>
        <span className="v2-mono text-[10px] v2-muted">09:34 EDT</span>
      </div>

      {/* minimal chart pane with 2-3 hairline reference lines */}
      <div className="v2-card-flat relative mt-3 h-28 overflow-hidden rounded-sm md:h-36">
        <div
          className="absolute left-0 right-0"
          style={{ top: "30%", borderTop: "1px dashed var(--hairline)" }}
        />
        <div
          className="absolute left-0 right-0"
          style={{ top: "55%", borderTop: "1px dashed var(--hairline)" }}
        />
        <div
          className="absolute left-0 right-0"
          style={{ top: "75%", borderTop: "1px dashed var(--hairline)" }}
        />
        <div className="absolute bottom-2 left-2 v2-mono text-[9px] v2-muted">
          R: 20,388 · S: 20,412
        </div>
      </div>

      {/* AI readout block */}
      <div className="mt-3 rounded-sm border border-[var(--hairline)] bg-[var(--bg-surface-2)] p-3">
        <div className="flex items-center gap-2">
          <span className="v2-caret inline-block h-1.5 w-1.5 rounded-full" />
          <span className="v2-eyebrow v2-violet">
            AI READOUT
          </span>
        </div>
        <div className="v2-mono mt-2 text-[12px] v2-data leading-relaxed">
          bias <span className="v2-violet">BULLISH</span> · R:R 2.9
          · entry 20,412
        </div>
      </div>

      {/* decision line — the SINGLE amber accent for the section */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--amber)" }}
        />
        <span className="v2-mono text-[13px] v2-fg">HOLD — wait for 4H close</span>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function DisciplineTheater() {
  const reduced = usePrefersReducedMotion();
  const outerRef = useRef<HTMLDivElement>(null);

  // Live in-view gate for the flicker side-effect (perf 4.2).
  const [liveRef, inView] = useInViewLive<HTMLDivElement>({
    rootMargin: "100px 0px",
  });

  // Scroll progress across the tall pin range.
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Left panel: slides off-screen left + fades. Flicker cadence speeds up
  // with progress (we feed progress into an opacity motion value).
  const leftX = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0, -100], {
    clamp: true,
  });
  const leftOpacity = useTransform(scrollYProgress, [0, 0.5, 0.75], [1, 1, 0], {
    clamp: true,
  });
  // Flicker intensity 0..1 — rises with scroll progress.
  const flicker = useTransform(scrollYProgress, [0, 1], [0, 1], { clamp: true });

  // Right panel: settles (opacity up, slight translateY down).
  const rightOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.7, 0.9, 1], {
    clamp: true,
  });
  const rightY = useTransform(scrollYProgress, [0, 1], [12, 0], { clamp: true });

  // Drive a local state for the flicker opacity on the left chips. We
  // sample the motion value on rAF only while in-view + not reduced.
  const [flickerVal, setFlickerVal] = useState(0);
  useEffect(() => {
    if (reduced || !inView) return;
    let raf = 0;
    const tick = () => {
      setFlickerVal(flicker.get());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView, flicker]);

  return (
    <section id="theater" className="v2-section v2-aurora v2-aurora-market v2-fold">
      <Cast kind="market" className="mx-auto w-full v2-shell">
        {/* Headline (above the split) */}
        <Reveal className="pt-2">
          <div className="v2-eyebrow v2-muted">SPEC 02 / THE DISCIPLINE THEATER</div>
          <h2 className="v2-h2 mt-3 max-w-3xl">
            YOU KNOW WHAT YOU SHOULD DO. THAT&apos;S NOT THE PROBLEM.
          </h2>
          <div className="v2-ts mt-4">
            <span>09:34 EDT</span>
          </div>
        </Reveal>

        {/* MOBILE: two stacked static cards, simple Reveal, no scroll film */}
        <div className="mt-8 space-y-4 lg:hidden">
          <Reveal>
            <div className="h-[340px]">
              <CrowdedDesktop flicker={0} />
            </div>
            <div className="v2-eyebrow v2-muted mt-2">BEFORE · THE TYPICAL DESKTOP</div>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-[340px]">
              <CleanReadout />
            </div>
            <div className="v2-eyebrow v2-muted mt-2">
              AFTER · INSIDE TRADECOPILIT
            </div>
          </Reveal>
        </div>

        {/* DESKTOP: tall pin range holding a sticky stage.
            The 200vh container is the DIRECT parent of the sticky element
            so position:sticky has room to travel. useScroll targets it. */}
        <div ref={outerRef} className="relative mt-10 hidden lg:block lg:h-[200vh]">
          <div
            ref={liveRef}
            className="lg:sticky lg:top-0 lg:h-screen"
          >
            <div className="grid h-full grid-cols-2 items-center gap-8">
              {/* LEFT — crowded, slides off */}
              <motion.div
                className="h-[420px]"
                style={
                  reduced
                    ? undefined
                    : { x: leftX, opacity: leftOpacity }
                }
              >
                <CrowdedDesktop flicker={reduced ? 0 : flickerVal} />
              </motion.div>

              {/* RIGHT — clean, settles */}
              <motion.div
                className="h-[420px]"
                style={
                  reduced
                    ? undefined
                    : { opacity: rightOpacity, y: rightY }
                }
              >
                <CleanReadout />
              </motion.div>
            </div>

            {/* caption row under the split */}
            <div className="mt-6 grid grid-cols-2 gap-8">
              <div className="v2-eyebrow v2-muted">BEFORE · THE TYPICAL DESKTOP</div>
              <div className="v2-eyebrow v2-muted">AFTER · INSIDE TRADECOPILIT</div>
            </div>
          </div>
        </div>
      </Cast>
    </section>
  );
}