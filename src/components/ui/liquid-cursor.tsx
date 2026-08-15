"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function LiquidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only on the marketing homepage — a custom cursor is a cinematic flourish
    // there, but distracting and wrong over a dense app/dashboard surface.
    if (pathname !== "/") return;
    // Only enable on desktop pointer devices with fine pointer and no reduced motion preference
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || prefersReducedMotion) return;

    setEnabled(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve the accent token once (e.g. "--accent-rgb: 47 198 232") so the
    // cursor tint tracks the design system instead of a hardcoded hex.
    const accentRgbStr =
      getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "47 198 232";
    const [ar, ag, ab] = accentRgbStr.split(/\s+/).map((n) => parseInt(n, 10));
    const accent = (a: number) =>
      `rgba(${ar || 47}, ${ag || 198}, ${ab || 232}, ${a})`;
    const accentSolid = `rgb(${ar || 47}, ${ag || 198}, ${ab || 232})`;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse lerp state
    let targetX = width / 2;
    let targetY = height / 2;
    let currentX = targetX;
    let currentY = targetY;
    let vx = 0;
    let vy = 0;
    let isHoveringInteractive = false;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      // Check if mouse is hovering over interactive elements
      const targetEl = e.target as HTMLElement;
      if (
        targetEl &&
        (targetEl.tagName === "BUTTON" ||
          targetEl.tagName === "A" ||
          targetEl.tagName === "INPUT" ||
          targetEl.closest("button") ||
          targetEl.closest("a") ||
          targetEl.classList.contains("interactive"))
      ) {
        isHoveringInteractive = true;
      } else {
        isHoveringInteractive = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const render = () => {
      // Pause the loop when the tab is backgrounded — the browser throttles
      // rAF anyway, but skipping the canvas work saves CPU/GPU on laptops.
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, width, height);

      // Linear Interpolation (lerp) delay for fluid inertia
      const lerpAmount = 0.18;
      const prevX = currentX;
      const prevY = currentY;

      currentX += (targetX - currentX) * lerpAmount;
      currentY += (targetY - currentY) * lerpAmount;

      vx = currentX - prevX;
      vy = currentY - prevY;

      const speed = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx);

      // Elastic deformation based on speed
      const stretch = Math.min(speed * 0.08, 0.6);
      const radiusX = isHoveringInteractive ? 22 : 12 * (1 + stretch);
      const radiusY = isHoveringInteractive ? 22 : 12 * (1 - stretch * 0.5);

      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(angle);

      // Draw Liquid Blob Outer Glow & Body
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = isHoveringInteractive ? accent(0.25) : accent(0.4);
      ctx.strokeStyle = accent(0.8);
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Core center dot
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = accentSolid;
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [pathname]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
      style={{ mixBlendMode: "difference" }}
    />
  );
}
