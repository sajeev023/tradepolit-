"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * ElasticCard — rewritten on the token system.
 *
 * Previously used a competing neutral/emerald palette (border-neutral-800/80,
 * bg-neutral-900/60, emerald hover). Now uses the same surface treatment as
 * `.card` so the landing page and dashboard share one visual language.
 *
 * Retains the spring hover lift that gives it a premium, tactile feel.
 */
interface ElasticCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ElasticCard({ children, className = "", onClick, style }: ElasticCardProps) {
  return (
    <motion.div
      onClick={onClick}
      style={style}
      whileHover={onClick ? {
        scale: 1.02,
        y: -3,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      } : { y: -2 }}
      whileTap={onClick ? {
        scale: 0.97,
        transition: { type: "spring", stiffness: 500, damping: 20 },
      } : undefined}
      className={`card ${onClick ? "card-interactive" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
