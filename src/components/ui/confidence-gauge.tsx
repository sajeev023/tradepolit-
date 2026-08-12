"use client";

import { motion } from "framer-motion";

/**
 * ConfidenceGauge — renders AI confidence as a calibrated instrument
 * instead of a flat "HIGH" / "MEDIUM" / "LOW" text label.
 *
 * Accepts either a numeric 0-100 or a string label we map to a value.
 */
export function ConfidenceGauge({
  value,
  delay = 0,
}: {
  value: number | string;
  delay?: number;
}) {
  const numeric = typeof value === "number"
    ? value
    : value.toUpperCase() === "HIGH" || value.toUpperCase() === "STRONG"
      ? 78
      : value.toUpperCase() === "MEDIUM" || value.toUpperCase() === "MODERATE"
        ? 55
        : value.toUpperCase() === "LOW" || value.toUpperCase() === "WEAK"
          ? 30
          : 50;

  const label = numeric >= 70 ? "HIGH" : numeric >= 45 ? "MODERATE" : "LOW";
  const color = numeric >= 70 ? "var(--color-profit)" : numeric >= 45 ? "var(--color-warning)" : "var(--color-loss)";

  // Arc is 180° (semi-circle). Map 0-100 to stroke-dasharray of the half-circumference.
  const circumference = Math.PI * 36; // r=36
  const filled = (numeric / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay }}
      className="flex flex-col items-center"
    >
      <svg width="52" height="30" viewBox="0 0 52 30" fill="none">
        {/* Track */}
        <path
          d="M 4 28 A 22 22 0 0 1 48 28"
          stroke="var(--color-border-default)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Fill */}
        <motion.path
          d="M 4 28 A 22 22 0 0 1 48 28"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: delay + 0.1 }}
        />
      </svg>
      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>
        {label}
      </span>
      <span className="text-[8px] font-mono" style={{ color: "var(--color-text-quaternary)" }}>
        {numeric}%
      </span>
    </motion.div>
  );
}
