"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * StickyMobileCta — a compact CTA bar fixed to the bottom of the viewport
 * on mobile, revealed after the user scrolls past the first viewport.
 * Hidden on ≥768px (CSS). Respects safe-area inset.
 */
export function StickyMobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`tc-mobile-cta ${show ? "in" : ""}`} aria-hidden={!show}>
      <Link
        href="/login"
        className="flex-1 h-11 rounded-lg border border-[var(--color-border-default)] text-[13px] font-semibold text-[var(--ink)] flex items-center justify-center"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="flex-[1.4] h-11 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-[14px] font-bold flex items-center justify-center gap-1.5"
      >
        Start Free — No Card
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}