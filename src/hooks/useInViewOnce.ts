"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useInViewOnce — fires once when the element enters the viewport, then
 * stops observing. Returns `[ref, isInView]`.
 *
 * The hook itself runs regardless of reduced-motion preference; the
 * companion CSS (.tc-reveal / .tc-reveal-blur) collapses to an
 * always-visible, no-motion state under prefers-reduced-motion so the
 * hook's `in` toggle is a no-op visually in that case.
 *
 * SSR-safe: IntersectionObserver is only referenced inside useEffect.
 */
export function useInViewOnce<T extends Element = HTMLDivElement>(
  options?: IntersectionObserverInit
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // SSR / non-browser — reveal immediately so content is never trapped.
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px", ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return [ref, inView];
}