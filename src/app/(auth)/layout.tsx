"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { TrendingUp, LineChart, Brain, BookOpen } from "lucide-react";

/* ─── Cursor-Reactive Background ─── */
function AmbientCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const orbs = useRef<{ el: HTMLDivElement; ox: number; oy: number; speed: number }[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced-motion preference: render the orbs statically, no loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMove);

    // Collect orb references
    const orbEls = Array.from(container.querySelectorAll<HTMLDivElement>("[data-orb]"));
    orbs.current = orbEls.map((el, i) => ({
      el,
      ox: parseFloat(el.dataset.orbX || "50"),
      oy: parseFloat(el.dataset.orbY || "50"),
      speed: [0.018, 0.012, 0.022][i] ?? 0.015,
    }));

    let frame: number;
    const current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    function loop() {
      current.x += (mouse.current.x - current.x) * 0.06;
      current.y += (mouse.current.y - current.y) * 0.06;
      const dx = (current.x / window.innerWidth - 0.5) * 2;
      const dy = (current.y / window.innerHeight - 0.5) * 2;
      orbs.current.forEach(({ el, speed }) => {
        el.style.transform = `translate(${dx * 40 * speed * 100}px, ${dy * 40 * speed * 100}px)`;
      });
      frame = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Orb 1 — teal glow */}
      <div
        data-orb
        data-orb-x="15"
        data-orb-y="20"
        style={{
          position: "absolute",
          left: "15%",
          top: "20%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(var(--accent-rgb),0.13) 0%, transparent 70%)",
          filter: "blur(40px)",
          transition: "transform 0.1s linear",
          willChange: "transform",
        }}
      />
      {/* Orb 2 — deep indigo */}
      <div
        data-orb
        data-orb-x="70"
        data-orb-y="55"
        style={{
          position: "absolute",
          left: "70%",
          top: "55%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(99,102,241,0.09) 0%, transparent 70%)",
          filter: "blur(50px)",
          transition: "transform 0.1s linear",
          willChange: "transform",
        }}
      />
      {/* Orb 3 — subtle gold */}
      <div
        data-orb
        data-orb-x="45"
        data-orb-y="80"
        style={{
          position: "absolute",
          left: "45%",
          top: "80%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(234,179,8,0.07) 0%, transparent 70%)",
          filter: "blur(36px)",
          transition: "transform 0.1s linear",
          willChange: "transform",
        }}
      />

      {/* Fine grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Vignette top + bottom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(9,9,11,0) 0%, rgba(9,9,11,0.6) 100%)",
        }}
      />
    </div>
  );
}

/* ─── Floating badge ─── */
function TrustBadge() {
  return (
    <div
      className="auth-float-in"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        border: "1px solid rgba(var(--accent-rgb),0.25)",
        background: "rgba(var(--accent-rgb),0.06)",
        backdropFilter: "blur(12px)",
        marginBottom: 24,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--color-accent-primary)",
          boxShadow: "0 0 8px rgba(var(--accent-rgb),0.8)",
          flexShrink: 0,
          animation: "pulse-dot 2s ease infinite",
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-accent-primary)", letterSpacing: "0.02em" }}>
        Free tier — no card required
      </span>
    </div>
  );
}

/* ─── Feature row with line icons (no emojis) ─── */
function FeatureRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(var(--accent-rgb),0.08)",
          border: "1px solid rgba(var(--accent-rgb),0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent-primary)",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#FAFAFA", letterSpacing: "-0.01em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#71717A", marginTop: 2, lineHeight: 1.5 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ─── Design principle (honest, no fabricated social proof) ─── */
function DesignPrinciple() {
  return (
    <div
      className="auth-float-in"
      style={{
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-accent-primary)",
          display: "block",
          marginBottom: 8,
        }}
      >
        Read-only by design
      </span>
      <p style={{ fontSize: 12, color: "#A1A1AA", lineHeight: 1.6 }}>
        No broker connection. No fund custody. No trade execution. TradCopilot analyzes your charts and coaches your discipline — your capital stays entirely yours.
      </p>
    </div>
  );
}

/* ─── Layout ─── */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes auth-enter {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .auth-enter    { animation: auth-enter 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-float-in { animation: auth-enter 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .float-logo    { animation: float-slow 6s ease-in-out infinite; }
      `}</style>

      <AmbientCanvas />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* ── Left Branding Panel ── */}
        <div
          className="hidden lg:flex"
          style={{
            width: "44%",
            maxWidth: "520px",
            flexShrink: 0,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 48px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(9,9,11,0.4)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              className="float-logo"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg,var(--color-accent-primary) 0%,var(--color-accent-primary) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(var(--accent-rgb),0.35)",
              }}
            >
              <TrendingUp size={16} color="var(--background)" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#FAFAFA",
                letterSpacing: "-0.015em",
              }}
            >
              TradCopilot
            </span>
          </Link>

          {/* Center copy — vertically centered with fluid scaling */}
          <div className="auth-enter my-auto py-8" style={{ width: "100%", maxWidth: 380 }}>
            <TrustBadge />

            <h2
              style={{
                fontSize: "clamp(2rem, 1.5rem + 1.5vw, 2.5rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "#FAFAFA",
                margin: "0 0 14px",
              }}
            >
              The AI Copilot for
              <br />
              <span
                style={{
                  background: "linear-gradient(100deg,var(--color-accent-bright) 0%,var(--color-accent-primary) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Serious Traders
              </span>
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "#71717A",
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Chart analysis, trade journaling, and behavioral coaching — all in one calm, intelligent workspace.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
              <FeatureRow
                icon={<LineChart size={17} />}
                label="AI Chart Analysis"
                sub="Institutional-grade read on any symbol, instantly"
              />
              <FeatureRow
                icon={<Brain size={17} />}
                label="Behavioral Coaching"
                sub="Detects revenge trading, overtrading, and fear patterns"
              />
              <FeatureRow
                icon={<BookOpen size={17} />}
                label="Trade Journal"
                sub="Emotion tracking and AI weekly performance reports"
              />
            </div>

            <DesignPrinciple />
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11, color: "#52525B", lineHeight: 1.6 }}>
            TradCopilot does not execute trades, hold funds, or provide financial advice.
            Analytical tool for educational purposes only.
          </p>
        </div>

        {/* ── Right Auth Panel ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            overflowY: "auto",
            minHeight: "100dvh",
          }}
        >
          <div className="auth-form-container" style={{ width: "100%", maxWidth: 400 }}>{children}</div>
        </div>
      </div>
    </>
  );
}

