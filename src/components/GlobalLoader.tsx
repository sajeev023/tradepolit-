"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function GlobalLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start progress bar animation on route/param transitions
    setVisible(true);
    setProgress(15);

    const timer1 = setTimeout(() => setProgress(45), 100);
    const timer2 = setTimeout(() => setProgress(80), 300);
    const timer3 = setTimeout(() => {
      setProgress(100);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(fadeTimer);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2.5px",
        zIndex: 9999,
        backgroundColor: "rgba(6, 182, 212, 0.15)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "#06b6d4",
          boxShadow: "0 0 10px #06b6d4, 0 0 5px #06b6d4",
          transition: "width 200ms ease-out, opacity 150ms ease-in-out",
        }}
      />
    </div>
  );
}
