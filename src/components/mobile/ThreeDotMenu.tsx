"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ThreeDotMenuProps {
  items: MenuItem[];
  size?: number;
  align?: "left" | "right";
  label?: string;
}

export function ThreeDotMenu({ items, size = 18, align = "right", label }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKey);
      };
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors active:scale-95"
        aria-label={label || "More options"}
      >
        <MoreHorizontal size={size} style={{ color: "var(--color-text-tertiary)" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full mt-1 z-50 min-w-[160px] rounded-lg border shadow-xl overflow-hidden`}
            style={{
              [align]: 0,
              backgroundColor: "var(--color-bg-elevated, var(--color-bg-secondary))",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setOpen(false);
                  }
                }}
                disabled={item.disabled}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  color: item.destructive ? "#F87171" : "var(--color-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
