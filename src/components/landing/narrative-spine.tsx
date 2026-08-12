"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════
   NarrativeSpine — the single continuous thread through all 8 chapters.
   A fixed left-edge rail with a cyan progress fill (bound to page scroll)
   and one tick per chapter; the tick for the chapter currently in view
   lights up. Clicking a tick scrolls to that chapter. Desktop ≥ xl only
   (hidden below xl, where each section shows its own chapter chip).
   ═══════════════════════════════════════════════════════════════════════ */

export const CHAPTERS = [
  { id: "top", label: "01 · Premise" },
  { id: "pulse", label: "02 · Pulse" },
  { id: "gap", label: "03 · Gap" },
  { id: "origin", label: "04 · Origin" },
  { id: "workspace", label: "05 · Workspace" },
  { id: "intelligence", label: "06 · Intelligence" },
  { id: "difference", label: "07 · Difference" },
  { id: "commitment", label: "08 · Commitment" },
];

export function NarrativeSpine() {
  const { scrollYProgress } = useScroll();
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const sectionsRef = useRef<HTMLElement[]>([]);

  useMotionValueEvent(scrollYProgress, "change", (p) => setFill(p));

  useEffect(() => {
    const sections = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    sectionsRef.current = sections;
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the viewport top among intersecting ones.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (e.isIntersecting && (!best || e.boundingClientRect.top < (best as IntersectionObserverEntry).boundingClientRect.top)) {
            best = e;
          }
        }
        if (best) {
          const id = (best.target as HTMLElement).id;
          const idx = CHAPTERS.findIndex((c) => c.id === id);
          if (idx >= 0) setActive(idx);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="narrative-spine" aria-label="Chapter navigation">
      <div className="spine-track" />
      <motion.div className="spine-fill" style={{ scaleY: fill }} />
      {CHAPTERS.map((c, i) => (
        <button
          key={c.id}
          onClick={() => go(c.id)}
          className={`spine-tick ${active === i ? "active" : ""}`}
          aria-label={c.label}
          title={c.label}
        />
      ))}
    </nav>
  );
}