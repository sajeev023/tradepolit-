"use client";

import { type ReactNode, type ElementType, type Ref, type CSSProperties } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { resolveRevealClassName } from "@/lib/reveal";

export interface RevealProps {
  children: ReactNode;
  /** Blur-to-sharp reveal (use for section H2s). */
  blur?: boolean;
  /** Per-element stagger delay in ms (sets --tc-reveal-delay). */
  delay?: number;
  /** Render as a different element (default div). */
  as?: ElementType;
  className?: string;
}

/**
 * Reveal — scroll-reveal wrapper. Fades + rises 14px (or blur→sharp) when
 * scrolled into view, once. Stagger via the `delay` prop.
 * Falls back to always-visible under prefers-reduced-motion (CSS).
 */
export function Reveal({
  children,
  blur = false,
  delay = 0,
  as = "div",
  className = "",
}: RevealProps) {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const Tag = as as ElementType;

  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={resolveRevealClassName({ visible: inView, blur, className })}
      style={delay ? ({ ["--tc-reveal-delay" as string]: `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}