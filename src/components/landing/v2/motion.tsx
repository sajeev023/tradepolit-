"use client";

/* ═══════════════════════════════════════════════════════════════════════
   motion.tsx — the single animation utility module for the v2 homepage.

   Every timing constant lives here. Every scroll/viewport hook lives here.
   All animated properties are transform/opacity (perf rule 4.1). Reveal
   fires once per element (IntersectionObserver, unobserve after firing).
   Odometer/typewriter fire once per session (module-scoped fired Sets).
   ═══════════════════════════════════════════════════════════════════════ */

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Central timing constants (ms unless noted). */
export const TIMING = {
  reveal: 400,
  revealStagger: 60,
  hoverBorder: 150,
  hoverLift: 200,
  linkUnderline: 150,
  btnScale: 100,
  streamLine: 250,
  streamGap: 1200,
  streamLoop: 45000,
  wordSwap: 300,
  wordSwapPeriod: 6000,
  wordSwapPeriodMobile: 8000,
  odometer: 900,
  typewriterChar: 20,
  diffStagger: 300,
  diffEach: 150,
  toggle: 400,
  cast: 600,
  drift: 90000,
  orbit: 20000,
  changelog: 250,
  instrumentFlash: 150,
  instrumentCadence: 1000,
} as const;

/* ── prefers-reduced-motion ── */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/* ── In-view, fires once, unobserves after firing (3.7, 3.4, 3.10, 3.14) ── */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(
  opts?: { threshold?: number; rootMargin?: string }
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          ob.unobserve(el);
        }
      },
      {
        threshold: opts?.threshold ?? 0,
        rootMargin: opts?.rootMargin ?? "0px",
      }
    );
    ob.observe(el);
    return () => ob.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

/* ── In-view, LIVE (toggles), throttled to ≤1 recalculation/sec (3.9 cast) ── */
export function useInViewLive<T extends HTMLElement = HTMLDivElement>(
  opts?: { threshold?: number; rootMargin?: string }
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = 0;
    let lastState = false;
    const ob = new IntersectionObserver(
      ([entry]) => {
        const now = performance.now();
        // Throttle: ignore same-state callbacks within 1s of the last change.
        if (entry.isIntersecting === lastState && now - last < 1000) return;
        last = now;
        lastState = entry.isIntersecting;
        setInView(entry.isIntersecting);
      },
      {
        threshold: opts?.threshold ?? 0,
        rootMargin: opts?.rootMargin ?? "0px",
      }
    );
    ob.observe(el);
    return () => ob.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

/* ── Odometer (3.4): counts once on first in-view, 900ms ease-out ── */
const odometerFired = new Set<string>();
export function useOdometer(
  value: number,
  active: boolean,
  id: string,
  duration = TIMING.odometer
): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() =>
    reduced || odometerFired.has(id) ? value : 0
  );
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    if (reduced || odometerFired.has(id)) {
      setDisplay(value);
      odometerFired.add(id);
      return;
    }
    odometerFired.add(id);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value, id, duration, reduced]);
  return display;
}

/* ── Typewriter (3.10): ONE pass, 20ms/char, no replay ── */
const typewriterFired = new Set<string>();
export function useTypewriter(
  text: string,
  active: boolean,
  id: string
): string {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(() =>
    reduced || typewriterFired.has(id) ? text : ""
  );
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    if (reduced || typewriterFired.has(id)) {
      setOut(text);
      typewriterFired.add(id);
      return;
    }
    typewriterFired.add(id);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setOut(text.slice(0, i));
      if (i < text.length) timer = setTimeout(tick, TIMING.typewriterChar);
    };
    timer = setTimeout(tick, TIMING.typewriterChar);
    return () => clearTimeout(timer);
  }, [active, text, id, reduced]);
  return out;
}

/* ── Word-swap (3.2): cycles words, static under reduced motion ── */
export function useWordSwap(
  words: string[],
  active: boolean,
  period: number = TIMING.wordSwapPeriod
): string {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active || reduced || words.length <= 1) return;
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % words.length;
      setIdx(i);
    }, period);
    return () => clearInterval(iv);
  }, [active, reduced, period, words.length]);
  return words[idx] ?? words[0] ?? "";
}

/* ── Reveal wrapper (3.7): blur-fade in, optional stagger delay ── */
export function Reveal({
  children,
  className = "",
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      className={`v2-reveal ${inView ? "v2-revealed" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Cast wrapper (3.9): toggles a violet/amber surface cast on enter/leave ── */
export function Cast({
  kind,
  children,
  className = "",
}: {
  kind: "ai" | "market";
  children: ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInViewLive<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`v2-cast v2-cast-${kind} ${inView ? "v2-cast-on" : ""} ${className}`}
    >
      {children}
    </div>
  );
}