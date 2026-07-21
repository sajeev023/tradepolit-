"use client";

import { useEffect, useRef, useState } from "react";

export function LiquidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only enable on desktop pointer devices with fine pointer and no reduced motion preference
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || prefersReducedMotion) return;

    setEnabled(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      ctx.fillStyle = isHoveringInteractive
        ? "rgba(30, 212, 168, 0.25)"
        : "rgba(30, 212, 168, 0.4)";
      ctx.strokeStyle = "rgba(30, 212, 168, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Core center dot
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#1ED4A8";
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
  }, []);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
      style={{ mixBlendMode: "difference" }}
    />
  );
}
