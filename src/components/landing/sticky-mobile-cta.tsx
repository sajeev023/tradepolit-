"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * StickyMobileCta — a compact single-action primary CTA bar fixed to the bottom
 * of the viewport on mobile (≤767px). Revealed after the user scrolls past the
 * first viewport section, and automatically hidden when on-page CTA clusters
 * are visible to prevent redundant button stacking.
 */
export function StickyMobileCta() {
  const [scrolledPast, setScrolledPast] = useState(false);
  const [onPageCtaVisible, setOnPageCtaVisible] = useState(false);

  // Track scroll depth
  useEffect(() => {
    const onScroll = () => {
      setScrolledPast(window.scrollY > 280);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track visibility of on-page CTAs
  useEffect(() => {
    const ctas = document.querySelectorAll("[data-onpage-cta]");
    if (ctas.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((entry) => entry.isIntersecting);
        setOnPageCtaVisible(anyVisible);
      },
      { threshold: 0.1 }
    );

    ctas.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = scrolledPast && !onPageCtaVisible;

  const inertProps = !isVisible
    ? { tabIndex: -1 as const, "aria-hidden": true, style: { pointerEvents: "none" as const } }
    : { tabIndex: undefined, "aria-hidden": undefined, style: undefined };

  return (
    <div
      className={`tc-mobile-cta ${isVisible ? "in" : ""}`}
      aria-hidden={!isVisible}
    >
      <Link
        href="/signup"
        tabIndex={inertProps.tabIndex}
        aria-hidden={inertProps["aria-hidden"]}
        style={inertProps.style}
        className="w-full h-12 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-[14px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(var(--accent-rgb),0.3)] active:scale-[0.98] transition-transform"
      >
        <span>Start Free — No Card Required</span>
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}