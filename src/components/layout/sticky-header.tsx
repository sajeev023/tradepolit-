"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

export function StickyHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > 100 && latest > previous) {
      setHidden(true);
    } else {
      setHidden(false);
    }

    if (latest > 20) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  });

  return (
    <motion.header
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "bg-neutral-950/80 border-b border-neutral-800/60 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      } ${className}`}
    >
      {children}
    </motion.header>
  );
}
