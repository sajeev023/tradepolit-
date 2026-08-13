"use client";

/* ═══════════════════════════════════════════════════════════════════════
   SEC 08 — The Signature (final CTA + pricing)

   Real pricing values preserved. A single amber light brightens the dark
   signature field — the one amber for the section is the primary CTA, with
   a subtle radial glow behind it. Cast kind="market". Reduced-motion safe.
   ═══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal, Cast } from "./motion";
import { useDemoLogin } from "../demo-button";

const FREE_FEATURES = [
  "5 AI chart analyses per day",
  "Standard response speed",
  "Last 20 trades in memory",
  "Behavioral coaching basics",
];

const PRO_FEATURES = [
  "Unlimited AI chart analyses",
  "Multi-model race pipeline (<3s)",
  "Persistent 20-trade memory & full journal context",
  "Real-time revenge & overtrading detection",
  "Weekly AI performance & risk reports",
];

function CheckDot() {
  return (
    <span
      className="v2-mono flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full"
      style={{
        border: "1px solid var(--hairline)",
        background: "var(--bg-surface-2)",
        color: "var(--text-secondary)",
      }}
      aria-hidden="true"
    >
      <Check size={9} strokeWidth={3} />
    </span>
  );
}

export function Signature() {
  const { isLoading, handleDemo } = useDemoLogin();

  return (
    <section
      id="pricing"
      className="v2-section v2-fold v2-aurora v2-aurora-market"
    >
      <Cast kind="market" className="v2-shell">
        {/* Eyebrow */}
        <Reveal>
          <div className="v2-eyebrow mb-10 text-center">SPEC 08 / THE SIGNATURE</div>
        </Reveal>

        {/* ── PART A — PRICING ── */}
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* FREE card */}
          <Reveal delay={0}>
            <div className="v2-card v2-card-flat flex h-full flex-col gap-5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="v2-h2 text-[20px]">Free</h3>
                <span className="v2-chip">No card</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="v2-mono text-[40px] font-semibold leading-none v2-fg">
                  $0
                </span>
                <span className="v2-mono text-[12px] v2-muted">/ forever</span>
              </div>
              <p className="v2-body text-[12px] v2-muted">
                For occasional traders who want a second opinion before entries.
              </p>
              <ul className="flex flex-col gap-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckDot />
                    <span className="v2-mono text-[12px] v2-fg">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                <Link href="/signup" className="v2-btn-ghost w-full">
                  Start Free — No Card
                </Link>
              </div>
            </div>
          </Reveal>

          {/* PRO card — order-1 on mobile so it shows first */}
          <Reveal delay={60} className="md:order-2 order-1">
            <div
              className="v2-card flex h-full flex-col gap-5 p-6"
              style={{ border: "1px solid var(--hairline-hover)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="v2-h2 text-[20px]">Pro Terminal</h3>
                <span className="v2-chip">Most Popular</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="v2-mono text-[40px] font-semibold leading-none v2-fg">
                  $7.49
                </span>
                <span className="v2-mono text-[12px] v2-muted">
                  / month · cancel anytime
                </span>
              </div>
              <p className="v2-body text-[12px] v2-muted">
                For active day traders who want unlimited scans and full
                behavioral enforcement.
              </p>
              <ul className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckDot />
                    <span className="v2-mono text-[12px] v2-fg">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                <Link
                  href="/signup?plan=pro"
                  className="v2-btn-ghost w-full"
                >
                  Start 7-Day Pro Trial
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── PART B — FINAL CTA BAND (the signature) ── */}
        <Reveal delay={120}>
          <div
            className="relative mt-16 flex min-h-[60vh] items-center justify-center overflow-hidden"
            style={{ background: "var(--bg-field)" }}
          >
            {/* Single amber presence — a flat --amber-weak surface tint
                (the one amber for the section). Not a radial-gradient glow:
                3.16a forbids glow/bloom, so depth comes from the uniform
                tinted surface, not a centered bloom. */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "var(--amber-weak)" }}
              aria-hidden="true"
            />

            {/* Giant mono watermark behind the headline */}
            <span
              className="v2-watermark v2-mono pointer-events-none absolute select-none"
              style={{
                fontSize: "clamp(120px, 20vw, 320px)",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                color: "var(--bg-surface-2)",
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              2.0R
            </span>

            {/* Foreground content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
              <h2 className="v2-h2 max-w-2xl">
                YOUR NEXT TRADE IS ALREADY WRITTEN IN YOUR BEHAVIOR. READ IT
                FIRST.
              </h2>

              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link href="/signup" className="v2-btn-primary">
                  Start Free — No Card
                </Link>
                <button
                  type="button"
                  onClick={handleDemo}
                  disabled={isLoading}
                  className="v2-btn-ghost"
                >
                  {isLoading ? "Starting…" : "Run 2 Free Scans"}
                </button>
              </div>

              <p className="v2-mono text-[11px] v2-muted">
                No card. No deposit. No demo call with a stranger.
              </p>
            </div>
          </div>
        </Reveal>
      </Cast>
    </section>
  );
}