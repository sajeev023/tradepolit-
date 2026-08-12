"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemoLogin } from "./demo-button";

/* MobileStickyCta — a compact glass CTA bar that slides in once the user
   scrolls past the hero, keeping the conversion action reachable on long
   mobile scrolls without cluttering the first viewport. Hidden on ≥ lg. */
export function MobileStickyCta() {
  const [show, setShow] = useState(false);
  const { isLoading, handleDemo } = useDemoLogin();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="lg:hidden fixed bottom-0 inset-x-0 z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="glass border-t border-[var(--color-border-default)] px-3 py-2.5 flex items-center gap-2.5">
            <Link
              href="/signup"
              className="btn-primary-lg flex-1 h-11 text-[13px]"
            >
              Start Free — No Card
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={handleDemo}
              disabled={isLoading}
              className="btn-secondary h-11 px-3.5 text-[12px] font-semibold"
              aria-label="Try instant demo"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-[var(--color-text-tertiary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} style={{ color: "var(--color-accent-primary)" }} />
              )}
              Demo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}