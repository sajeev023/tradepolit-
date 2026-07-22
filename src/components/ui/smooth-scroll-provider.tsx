"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion & touch device (mobile)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    if (prefersReducedMotion || isTouch) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll updates with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    const updateGSAP = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateGSAP);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateGSAP);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
