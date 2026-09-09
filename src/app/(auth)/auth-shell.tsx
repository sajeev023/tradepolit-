"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { TrendingUp, LineChart, Brain, BookOpen } from "lucide-react";

/* ─── Static High-Performance Backdrop ─── */
function TerminalBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Fine grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette top + bottom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(5,7,11,0.2) 0%, rgba(5,7,11,0.85) 100%)",
        }}
      />
    </div>
  );
}

/* ─── Feature row with line icons (no emojis) ─── */
function FeatureRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 6,
          background: "rgba(var(--accent-rgb),0.06)",
          border: "1px solid rgba(var(--accent-rgb),0.18)",
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
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.5 }}>
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
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--color-accent-primary)",
          display: "block",
          marginBottom: 6,
        }}
      >
        Read-only verification
      </span>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
        No broker connection. No trade execution. TradCopilot analyzes market structures and enforces your discipline rules while your capital stays entirely yours.
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
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-enter    { animation: auth-enter 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-float-in { animation: auth-enter 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
      `}</style>

      <TerminalBackdrop />

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
            maxWidth: "500px",
            flexShrink: 0,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 48px",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(10,15,24,0.75)",
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
                width: 30,
                height: 30,
                borderRadius: 6,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={16} color="var(--background)" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "-0.015em",
              }}
            >
              TradCopilot
            </span>
          </Link>

          {/* Center copy ── vertically centered with fluid scaling */}
          <div className="auth-enter my-auto py-8" style={{ width: "100%", maxWidth: 380 }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 1.25rem + 1.2vw, 2.25rem)",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
                color: "var(--foreground)",
                margin: "0 0 12px",
              }}
            >
              Technical Analysis &amp; Trade Discipline
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Real-time chart telemetry, persistent session memory, and behavioral guardrails in one focused workspace.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <FeatureRow
                icon={<LineChart size={16} />}
                label="Chart Telemetry"
                sub="Live multi-indicator technical read on any symbol"
              />
              <FeatureRow
                icon={<Brain size={16} />}
                label="Behavioral Detection"
                sub="Catches revenge trading and risk anomalies before entry"
              />
              <FeatureRow
                icon={<BookOpen size={16} />}
                label="Trade Journal"
                sub="Automated session metrics and discipline tracking"
              />
            </div>

            <DesignPrinciple />
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5, opacity: 0.8 }}>
            TradCopilot does not execute trades, hold funds, or provide financial advice.
            Analytical workstation for educational and discipline purposes.
          </p>
        </div>

        {/* ── Right Auth Panel ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
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

