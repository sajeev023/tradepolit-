"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** "tall" fills most of the viewport (Copilot); "auto" hugs its content. */
  size?: "auto" | "tall";
  /** Content manages its own scrolling/footer (e.g. a chat panel + composer). */
  flush?: boolean;
  children: ReactNode;
}

/** Phone-native bottom sheet: safe-area aware, Escape/scrim to dismiss, above the dock. */
export function Sheet({ open, onClose, title, size = "auto", flush = false, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[56] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-[58] flex flex-col rounded-t-[24px] border-t"
            style={{
              background: "var(--panel-1)",
              borderColor: "var(--color-border-strong)",
              height: size === "tall" ? "90dvh" : undefined,
              maxHeight: "90dvh",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex shrink-0 flex-col items-center px-4 pb-1 pt-2.5">
              <span className="mb-2 h-1 w-9 rounded-full" style={{ background: "var(--color-border-strong)" }} />
              <div className="flex w-full items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
                <button onClick={onClose} className="icon-button" aria-label="Close"><X size={17} /></button>
              </div>
            </div>
            <div className={flush ? "flex min-h-0 flex-1 flex-col" : "custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4"} data-lenis-prevent>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
