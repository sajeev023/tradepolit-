"use client";

import { useCountUp } from "@/hooks/useCountUp";

export interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * CountUp — renders a value that counts from 0 to `value` once on scroll
 * into view (1.1s eased). Prefix/suffix stay static. Mono tabular numerics
 * are applied by the parent via the design system (`.tp-mono` / font-mono).
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1100,
  className = "",
}: CountUpProps) {
  const [ref, display] = useCountUp<HTMLSpanElement>({
    value,
    decimals,
    duration,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}