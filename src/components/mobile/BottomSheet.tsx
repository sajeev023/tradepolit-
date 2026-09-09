"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({ open, onClose, title, children, maxHeight = "80vh" }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t overflow-hidden"
            style={{
              maxHeight,
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border-subtle)" }}>
              {title && <span className="text-sm font-bold text-[var(--color-text-primary)]">{title}</span>}
              {!title && <div />}
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] cursor-pointer"
                aria-label="Close"
              >
                <X size={16} style={{ color: "var(--color-text-tertiary)" }} />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
