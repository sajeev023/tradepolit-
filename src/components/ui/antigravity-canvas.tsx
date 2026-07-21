"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: "circle" | "square" | "triangle";
  baseX: number;
  baseY: number;
  theta: number;
  phi: number;
  spriteIndex: number;
}

export function AntigravityCanvas({
  particleCount = 100,
  className = "",
}: {
  particleCount?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [morphMode, _setMorphMode] = useState<"drift" | "orbit">("drift");
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  const morphModeRef = useRef<"drift" | "orbit">("drift");
  useEffect(() => {
    morphModeRef.current = morphMode;
  }, [morphMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // ── Initialize Particles ──
    const particles: Particle[] = [];
    const shapes: ("circle" | "square" | "triangle")[] = ["circle", "square", "triangle"];
    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const x = Math.random() * width;
      const y = Math.random() * height;
      const shape = shapes[i % shapes.length];

      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5,
        color: "",
        shape,
        baseX: x,
        baseY: y,
        theta,
        phi: Math.random() * Math.PI * 2,
        spriteIndex: 0,
      });
    }

    // ── Mouse Listeners ──
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // ── Main Physics Loop ──
    let time = 0;
    const gamma = 0.04;
    const gravity = -0.04;
    const magneticRadius = 140;
    const kappa = 0.6;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const isOrbitMode = morphModeRef.current === "orbit";
      const centerX = width / 2;
      const centerY = height / 2;
      const radiusBase = Math.min(width, height) * 0.28;

      const colors = ["rgba(255, 255, 255, 0.12)", "rgba(148, 163, 184, 0.08)", "rgba(71, 85, 105, 0.05)"];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isOrbitMode) {
          const R = radiusBase * (1 + 0.12 * Math.sin(1.5 * time + p.phi));
          const currentTheta = p.theta + 0.18 * time;
          const targetX = centerX + R * Math.cos(currentTheta);
          const targetY = centerY + R * Math.sin(currentTheta);

          const dxTarget = targetX - p.x;
          const dyTarget = targetY - p.y;
          p.vx += dxTarget * 0.04;
          p.vy += dyTarget * 0.04;
        } else {
          p.vy += gravity;
        }

        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < magneticRadius && dist > 0) {
            const force = kappa * Math.pow(1 - dist / magneticRadius, 2);
            const ux = dx / dist;
            const uy = dy / dist;

            p.vx += ux * force * 2.5;
            p.vy += uy * force * 2.5;
          }
        }

        p.vx *= 1 - gamma;
        p.vy *= 1 - gamma;

        p.x += p.vx;
        p.y += p.vy;

        if (!isOrbitMode) {
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          } else if (p.y > height + 20) {
            p.y = -20;
          }
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
        }

        const color = colors[i % colors.length];
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 3;

        ctx.beginPath();
        if (p.shape === "circle") {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "square") {
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else if (p.shape === "triangle") {
          ctx.moveTo(p.x, p.y - p.size * 1.5);
          ctx.lineTo(p.x + p.size, p.y + p.size);
          ctx.lineTo(p.x - p.size, p.y + p.size);
          ctx.closePath();
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount]);

  return (
    <div className={`relative w-full h-full pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

    </div>
  );
}
