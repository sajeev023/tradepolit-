"use client";

import { useState } from "react";
import Link from "next/link";
import { X, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemoLogin } from "./demo-button";

const menuItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Live Demo", onClick: true },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { isLoading, handleDemo } = useDemoLogin();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-[var(--color-bg-hover)] cursor-pointer"
        aria-label="Open menu"
      >
        <MoreHorizontal size={18} style={{ color: "var(--color-text-tertiary)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="mobile-menu-sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300, duration: 0.3 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t overflow-hidden"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-subtle)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <span className="text-sm font-bold text-[var(--color-text-primary)]">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={16} style={{ color: "var(--color-text-tertiary)" }} />
                </button>
              </div>
              <div className="py-2">
                {menuItems.map((item, i) =>
                  "onClick" in item && item.onClick === true ? (
                    <button
                      key={i}
                      disabled={isLoading}
                      onClick={() => {
                        setOpen(false);
                        handleDemo();
                      }}
                      className="flex items-center w-full px-5 py-3.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {isLoading ? "Loading..." : item.label}
                    </button>
                  ) : (
                    <Link
                      key={i}
                      href={(item as any).href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-5 py-3.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
