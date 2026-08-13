"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  TIMING,
  usePrefersReducedMotion,
  useInViewLive,
  useWordSwap,
  Cast,
  Reveal,
} from "./motion";
import { InstrumentRow } from "./instrument-row";
import { useDemoLogin } from "../demo-button";
import { trackClarityEvent } from "@/lib/clarity";

/* ═══════════════════════════════════════════════════════════════════════
   Observatory (SEC 01 / HERO) — read-only intelligence.

   55/45 asymmetric split: the left column carries the manifesto and the
   single amber CTA; the right column carries the living AI terminal — a
   deterministic, network-free analysis stream. Two-actor color law: amber
   appears exactly once (the primary CTA); violet appears only on the AI
   caret and the AI cast. The honest instrument strip spans the full width
   beneath the split. All values are pre-baked; nothing is fetched.
   ═══════════════════════════════════════════════════════════════════════ */

const STREAM_SEQUENCE = [
  "> NQ 15m",
  "  supply zone rejected 2x",
  "  RSI divergence while bid held",
  "  bias BULLISH",
  "  entry 20,412 / SL 20,368 / TP 20,540 / R:R 2.9",
  "✓ setup complete",
] as const;

const SWAP_WORDS = ["disciplined", "awake", "unshaken", "systematic"];
const SCANS_TODAY = 48203;
const MOBILE_LINE_CAP = 5;

/** Tailwind breakpoint mirror — reactively slices the stream window. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function Observatory() {
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const [rootRef, active] = useInViewLive<HTMLDivElement>({
    rootMargin: "100px 0px",
  });
  const [hovering, setHovering] = useState(false);
  const [count, setCount] = useState(0);

  // Stream engine — deterministic, transform/opacity only. Accumulates
  // elapsed time only while in-view AND not hovering, so pause/resume
  // freezes the cycle correctly. Reveals the sequence ONCE then holds —
  // terminal text gets a single entrance pass (3.16i); the violet caret
  // is the only continuous motion. No reset, no re-animation.
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setCount(STREAM_SEQUENCE.length);
      return;
    }
    if (!active || hovering) {
      lastTickRef.current = null; // freeze — do not advance the cycle
      return;
    }
    if (lastTickRef.current === null) lastTickRef.current = performance.now();
    const interval = setInterval(() => {
      lastTickRef.current = performance.now();
      setCount((prev) => Math.min(prev + 1, STREAM_SEQUENCE.length));
    }, TIMING.streamGap);
    return () => clearInterval(interval);
  }, [active, hovering, reduced]);

  const word = useWordSwap(
    SWAP_WORDS,
    active,
    isMobile ? TIMING.wordSwapPeriodMobile : TIMING.wordSwapPeriod
  );
  const { isLoading, handleDemo } = useDemoLogin();

  // Visible window: all revealed lines on desktop, last 5 on mobile. Keys
  // are the original sequence indices so sliding the mobile window does
  // not remount (and re-animate) lines that remain on screen.
  const visible = STREAM_SEQUENCE.map((line, i) => ({ line, key: i }))
    .filter(({ key }) => key < count)
    .filter(({ key }) => !isMobile || key >= count - MOBILE_LINE_CAP);

  return (
    <section
      id="top"
      ref={rootRef}
      className="v2-section v2-aurora v2-aurora-market relative overflow-hidden"
    >
      {/* Revision stamp (2.5) — top-right, desktop only */}
      <div className="v2-stamp absolute right-6 top-6 z-10 hidden md:block">
        TRADCOPILOT · v2.4 — Aug 2026
      </div>

      <div className="v2-shell">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* ───────────── LEFT 55% — manifesto ───────────── */}
          <div className="lg:col-span-7">
            <Reveal className="v2-eyebrow">
              SPEC 01 / READ-ONLY INTELLIGENCE
            </Reveal>

            <Reveal delay={60} className="mt-5">
              <h1
                className="v2-display"
                style={{ fontSize: "clamp(40px, 3rem + 3vw, 72px)" }}
              >
                <span className="block">THE MARKET DOES NOT NEED YOUR EMOTIONS.</span>
                <span className="block">
                  IT NEEDS YOUR{" "}
                  <span key={word} className="v2-swap-word v2-fg">
                    {word.toUpperCase()}
                  </span>{" "}
                  OBSERVATIONS.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={120} className="mt-6">
              <p className="v2-mono text-[14px] v2-muted">
                Read-only market intelligence. The copilot watches so you can decide.
              </p>
            </Reveal>

            <Reveal delay={180} className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  onClick={() => trackClarityEvent("hero_start_free_click")}
                  className="v2-btn-primary"
                >
                  Start Free — No Card
                </Link>
                <button
                  onClick={handleDemo}
                  disabled={isLoading}
                  className="v2-btn-ghost disabled:opacity-50"
                >
                  {isLoading ? "Loading…" : "Run 2 Free Scans"}
                </button>
              </div>
              <p className="v2-mono mt-4 text-[11px] v2-muted">
                No card. No deposit. No demo call with a stranger.
              </p>
            </Reveal>
          </div>

          {/* ───────────── RIGHT 45% — living AI terminal ───────────── */}
          <div className="lg:col-span-5">
            <Cast kind="ai">
              <div
                className="v2-zone v2-card overflow-hidden"
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{ background: "var(--bg-surface-1)" }}
              >
                {/* Header — deterministic ticker tape */}
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  <span className="v2-eyebrow">AI ANALYSIS</span>
                  <span className="v2-mono v2-data text-[12px]">
                    NQ 15m · 20,412.5 · +0.18%
                  </span>
                </div>

                {/* Stream body — each line enters via v2-stream-line */}
                <div className="min-h-[200px] px-4 py-4">
                  {visible.map(({ line, key }) => (
                    <div
                      key={key}
                      className="v2-stream-line v2-mono v2-data whitespace-pre text-[13px]"
                    >
                      {line}
                    </div>
                  ))}
                  <div className="v2-mono text-[13px]">
                    <span className="v2-caret" />
                  </div>
                </div>

                {/* Footer — static scan counter (the count-up odometer
                    3.4 lives in the Ledger; shown static here so the same
                    number is never counted twice — 3.16e). */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: "1px solid var(--hairline)" }}
                >
                  <span className="v2-eyebrow">SCANS TODAY</span>
                  <span className="v2-mono v2-data text-[14px]">
                    {SCANS_TODAY.toLocaleString("en-US")}
                  </span>
                </div>
              </div>

              <p className="v2-mono mt-3 text-[10px] v2-muted">
                Demo sequence — for illustration
              </p>
            </Cast>
          </div>
        </div>

        {/* Full-width honest instrument strip beneath the split */}
        <div className="mt-12 lg:mt-16">
          <InstrumentRow />
        </div>
      </div>
    </section>
  );
}