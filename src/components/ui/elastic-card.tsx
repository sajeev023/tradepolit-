"use client";

import { ReactNode, useCallback } from "react";
import { motion } from "framer-motion";

/**
 * ElasticCard — rewritten on the token system.
 *
 * Previously used a competing neutral/emerald palette (border-neutral-800/80,
 * bg-neutral-900/60, emerald hover). Now uses the same surface treatment as
 * `.card` so the landing page and dashboard share one visual language.
 *
 * Retains the spring hover lift that gives it a premium, tactile feel.
 * Pass `spotlight` to enable a cursor-following cyan glow (desktop, fine
 * pointer only — the CSS hides the effect on touch / no-hover devices).
 */
interface ElasticCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  spotlight?: boolean;
}

export function ElasticCard({ children, className = "", onClick, style, spotlight = false }: ElasticCardProps) {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <motion.div
      onClick={onClick}
      style={style}
      onMouseMove={spotlight ? handleMouseMove : undefined}
      whileHover={onClick ? {
        scale: 1.02,
        y: -3,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      } : { y: -2 }}
      whileTap={onClick ? {
        scale: 0.97,
        transition: { type: "spring", stiffness: 500, damping: 20 },
      } : undefined}
      className={`card ${spotlight ? "cursor-spotlight" : ""} ${onClick ? "card-interactive" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
