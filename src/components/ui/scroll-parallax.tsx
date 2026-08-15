"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollParallaxProps {
  children: ReactNode;
  /**
   * Parallax magnitude in pixels. The inner element is translated by this
   * distance (positive = drifts down relative to its track as the page scrolls
   * down, i.e. appears to "lag"). Keep small (16–40) — this is meant to read as
   * depth, not motion. Defaults to 24.
   */
  distance?: number;
  className?: string;
  /** Extra className on the moving inner layer. */
  innerClassName?: string;
}

/**
 * ScrollParallax — a subtle, scroll-scrubbed parallax layer driven by GSAP
 * ScrollTrigger (the same instance SmoothScrollProvider registers and syncs
 * with Lenis). Unlike `Reveal` (one-shot IntersectionObserver fade-in), this
 * moves continuously as the element passes through the viewport.
 *
 * Degradation contract:
 *   • prefers-reduced-motion → renders children static, no transforms, no JS.
 *   • GSAP/ScrollTrigger fail to load → static, no crash.
 *   • The outer wrapper participates in layout normally; only the inner layer
 *     is transformed, so document flow and pointer targets stay stable.
 */
export function ScrollParallax({
  children,
  distance = 24,
  className = "",
  innerClassName = "",
}: ScrollParallaxProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Skip on coarse-pointer (touch) devices — they run native scroll (no
    // Lenis) and scrubbed parallax janks there, plus touch users gain no
    // depth cue from it. Mirrors SmoothScrollProvider's own gating.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion || isTouch) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);

        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        // Scope the animation so its teardown is trivial and it can never
        // leak into sibling elements.
        ctx = gsap.context(() => {
          gsap.fromTo(
            inner,
            { y: -distance },
            {
              y: distance,
              ease: "none",
              scrollTrigger: {
                trigger: outer,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }, outer);

        // Wrapped content (e.g. the live-data workbench) renders progressively,
        // shifting page height after the ScrollTrigger is measured. Recalc
        // the start/end positions once layout settles so the parallax track
        // stays aligned with the real element position.
        ScrollTrigger.refresh();
      } catch {
        // Enhancement-only: stay static.
      }
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [distance]);

  return (
    <div
      ref={outerRef}
      className={className}
      // Symmetric block padding absorbs the full ±distance translate so the
      // moving layer never clips or overlaps neighbors. No overflow:hidden —
      // that would clip absolutely-positioned children (tooltips, popovers)
      // of interactive content we may wrap.
      style={{ paddingBlock: distance }}
    >
      <div ref={innerRef} className={innerClassName} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}