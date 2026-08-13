"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "./useInViewOnce";
import { computeCountUp, easeLargeMotion, formatNumeric } from "@/lib/reveal";

export interface UseCountUpOptions {
  /** Target value to count up to. */
  value: number;
  /** Animation duration in milliseconds. @default 1100 */
  duration?: number;
  /** Decimal places to render. @default 0 */
  decimals?: number;
  /** Easing function sampled per frame. @default easeLargeMotion */
  easing?: (p: number) => number;
  /** IntersectionObserver init override. */
  rootMargin?: string;
}

/**
 * useCountUp — animates from 0 to `value` once the element scrolls into
 * view, then stops. Returns `[ref, formattedValue]`.
 *
 * Under prefers-reduced-motion the value snaps to the target immediately
 * (no rAF loop) — the count-up degrades to a static number.
 */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>({
  value,
  duration = 1100,
  decimals = 0,
  easing = easeLargeMotion,
  rootMargin,
}: UseCountUpOptions): [React.RefObject<T | null>, string] {
  const [ref, inView] = useInViewOnce<T>(
    rootMargin ? { rootMargin } : undefined
  );
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || duration <= 0) {
      setDisplay(formatNumeric(value, decimals));
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const current = computeCountUp(now - start, duration, value, easing);
      setDisplay(formatNumeric(current, decimals));
      if (now - start < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(formatNumeric(value, decimals));
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, decimals, easing]);

  return [ref, display];
}