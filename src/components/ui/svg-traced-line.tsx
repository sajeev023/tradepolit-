"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface SvgTracedLineProps {
  className?: string;
  color?: string;
}

export function SvgTracedLine({ className = "", color = "rgba(6, 182, 212, 0.4)" }: SvgTracedLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const pathLength = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0.05, 0.2, 0.8, 0.95], [0, 1, 1, 0]);

  return (
    <div ref={ref} className={`relative w-full h-8 overflow-hidden pointer-events-none ${className}`}>
      <motion.svg
        style={{ opacity }}
        className="w-full h-full"
        viewBox="0 0 1200 24"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,12 Q 300,24 600,12 T 1200,12"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="0 1"
          style={{ pathLength }}
        />
      </motion.svg>
    </div>
  );
}
