"use client";

import { useEffect, useRef } from "react";

interface LenisInstance {
  destroy: () => void;
  on: (_e: string, _cb: () => void) => void;
  raf: (_time: number) => void;
}

interface GsapTicker {
  add: (_cb: (time: number) => void) => void;
  remove: (_cb: (time: number) => void) => void;
  lagSmoothing: (_v: number) => void;
}
interface GsapWithTicker {
  registerPlugin: (_p: unknown) => void;
  ticker: GsapTicker;
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  // Hold the live Lenis instance and its GSAP ticker callback in refs so the
  // effect teardown can tear them down without depending on stale state.
  const lenisRef = useRef<LenisInstance | null>(null);
  const updateGSAPRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion & touch device (mobile)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    if (prefersReducedMotion || isTouch) return;

    let active = true;
    // Dynamically import the heavy smooth-scroll libraries (~150KB) so they
    // never touch the main bundle — only desktop users without reduced-motion
    // ever download them.
    (async () => {
      try {
        const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
          import("lenis"),
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (!active) return;

        const typedGsap = gsap as unknown as GsapWithTicker;
        typedGsap.registerPlugin(ScrollTrigger);

        const lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 1.0,
          touchMultiplier: 2.0,
        });

        lenisRef.current = lenis as unknown as LenisInstance;

        // Sync Lenis scroll updates with GSAP ScrollTrigger
        lenis.on("scroll", ScrollTrigger.update);

        const updateGSAP = (time: number) => {
          (lenis as { raf: (t: number) => void }).raf(time * 1000);
        };
        updateGSAPRef.current = updateGSAP;

        typedGsap.ticker.add(updateGSAP);
        typedGsap.ticker.lagSmoothing(0);
      } catch (err) {
        // Smooth-scroll is enhancement-only; a load failure must never break
        // scrolling or crash the page. Stay on native scroll silently.
        console.warn("[SmoothScroll] Failed to load smooth-scroll libraries:", err);
      }
    })();

    return () => {
      active = false;
      const lenis = lenisRef.current;
      const updateGSAP = updateGSAPRef.current;
      lenisRef.current = null;
      updateGSAPRef.current = null;
      if (lenis && updateGSAP) {
        // Both libs are present only when the dynamic import resolved.
        import("gsap").then(({ gsap }) => {
          (gsap as unknown as GsapWithTicker).ticker.remove(updateGSAP);
        });
        lenis.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
