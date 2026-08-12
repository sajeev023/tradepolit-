"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

/* ─── Cursor-Reactive Background ─── */
function AmbientCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const orbs = useRef<{ el: HTMLDivElement; ox: number; oy: number; speed: number }[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
          background: "radial-gradient(circle at center, rgba(6, 182, 212,0.13) 0%, transparent 70%)",
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
        border: "1px solid rgba(6, 182, 212,0.25)",
        background: "var(--color-accent-primary-subtle)",
        backdropFilter: "blur(12px)",
        marginBottom: 28,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--color-accent-primary)",
          boxShadow: "0 0 8px rgba(6, 182, 212,0.8)",
          flexShrink: 0,
          animation: "pulse-dot 2s ease infinite",
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-accent-primary)", letterSpacing: "0.02em" }}>
        Early Access · Free during beta
      </span>
    </div>
  );
}

/* ─── Feature row ─── */
function FeatureRow({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "var(--color-accent-primary-subtle)",
          border: "1px solid rgba(6, 182, 212,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2, lineHeight: 1.5 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ─── Testimonial ─── */
function Testimonial() {
  return (
    <div
      className="auth-float-in"
      style={{
        padding: "18px 20px",
        borderRadius: 12,
        background: "var(--color-bg-hover)",
        border: "1px solid var(--color-border-default)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.65, fontStyle: "italic" }}>
        &quot;Finally a trading journal that actually understands my psychology. The AI catches revenge trading before I even realize I&apos;m doing it.&quot;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-accent-primary), #6366F1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#09090B",
          }}
        >
          MK
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Mohammed K.</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Prop Trader · Dubai</div>
        </div>
      </div>
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
        .auth-enter    { animation: auth-enter 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-float-in { animation: auth-enter 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
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
            width: "42%",
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
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(6, 182, 212,0.35)",
              }}
            >
              <TrendingUp size={16} color="#09090B" strokeWidth={2.5} />
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

          {/* Center copy */}
          <div className="auth-enter" style={{ maxWidth: 340 }}>
            <TrustBadge />

            <h2
              style={{
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.035em",
                color: "var(--color-text-primary)",
                margin: "0 0 16px",
              }}
            >
              The AI Copilot for
              <br />
              <span className="gradient-text">
                Serious Traders
              </span>
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "var(--color-text-tertiary)",
                lineHeight: 1.7,
                marginBottom: 36,
              }}
            >
              Chart analysis, trade journaling, and behavioral coaching — all in one calm, intelligent workspace.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
              <FeatureRow
                icon="📊"
                label="AI Chart Analysis"
                sub="Institutional-grade read on any symbol, instantly"
              />
              <FeatureRow
                icon="🧠"
                label="Behavioral Coaching"
                sub="Detects revenge trading, overtrading, and fear patterns"
              />
              <FeatureRow
                icon="📓"
                label="Trade Journal"
                sub="Emotion tracking and AI weekly performance reports"
              />
            </div>

            <Testimonial />
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11, color: "var(--color-text-quaternary)", lineHeight: 1.6 }}>
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
