"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ElasticCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ElasticCard({ children, className = "", onClick }: ElasticCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? {
        scale: 1.03,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      } : undefined}
      whileTap={onClick ? {
        scale: 0.97,
        transition: { type: "spring", stiffness: 500, damping: 20 },
      } : undefined}
      className={`group relative rounded-2xl border border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl p-6 shadow-xl transition-colors duration-300 hover:border-emerald-500/40 hover:bg-neutral-900/90 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {/* Subtle top inner glow line — uses group-hover so it needs the `group` class above to work */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {children}
    </motion.div>
  );
}
