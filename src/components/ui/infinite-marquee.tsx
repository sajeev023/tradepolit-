"use client";

import { ReactNode } from "react";

interface InfiniteMarqueeProps {
  children: ReactNode;
  direction?: "left" | "right";
  speed?: "slow" | "normal" | "fast";
  className?: string;
}

export function InfiniteMarquee({
  children,
  direction = "left",
  className = "",
}: InfiniteMarqueeProps) {
  const marqueeClass =
    direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  return (
    <div className={`marquee-container relative overflow-hidden w-full ${className}`}>
      <div className="flex w-max">
        <div className={`flex shrink-0 items-center gap-6 pr-6 ${marqueeClass}`}>
          {children}
        </div>
        <div className={`flex shrink-0 items-center gap-6 pr-6 ${marqueeClass}`} aria-hidden="true">
          {children}
        </div>
      </div>
      {/* Subtle fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-neutral-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-neutral-950 to-transparent" />
    </div>
  );
}
