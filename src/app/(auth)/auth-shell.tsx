"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LineChart, Brain, BookOpen, ShieldCheck } from "lucide-react";
import { Mark } from "@/components/shell/mark";
import { BRAND } from "@/lib/brand";

const POINTS = [
  { icon: LineChart, label: "Reads the chart", sub: "Live RSI, MACD, EMA and ATR on any symbol." },
  { icon: Brain, label: "Catches bad habits", sub: "Flags revenge trading and overtrading as it happens." },
  { icon: BookOpen, label: "Remembers everything", sub: "Journal and thesis outcomes become your patterns." },
] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh" style={{ background: "var(--background)" }}>
      {/* ── Brand panel (desktop) ── */}
      <aside
        className="relative hidden w-[46%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden border-r p-12 lg:flex"
        style={{ borderColor: "var(--hairline)", background: "var(--panel-1)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full opacity-[0.1] blur-[100px]" style={{ background: "var(--accent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[28%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.5), transparent)" }} />

        <Link href="/" className="relative inline-flex items-center gap-2.5" aria-label={`${BRAND.name} home`}>
          <Mark size={34} />
          <span className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">{BRAND.name}</span>
        </Link>

        <div className="relative my-auto max-w-[400px] py-10 animate-enter">
          <h2 className="font-serif text-[clamp(2.4rem,1.6rem+1.6vw,3.4rem)] leading-[1.02] tracking-[-0.02em] text-[var(--foreground)]">
            Your edge is <em className="text-[var(--accent)]">consistency.</em>
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
            {BRAND.name} is the copilot that remembers how you trade — and tells you when you drift from your own rules.
          </p>

          <ul className="mt-9 space-y-5">
            {POINTS.map(({ icon: Icon, label, sub }, i) => (
              <li key={label} className="flex gap-4" style={{ animation: `enter 0.5s var(--ease-out-expo) ${120 + i * 80}ms both` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: "rgba(var(--accent-rgb),0.25)", background: "rgba(var(--accent-rgb),0.07)", color: "var(--accent)" }}>
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--foreground)]">{label}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted-foreground)]">{sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-start gap-3 text-[11.5px] leading-relaxed text-[var(--muted-foreground)]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
          <p>
            Read-only. No broker connection, no trade execution — your capital stays yours. Educational analysis, not financial advice.
          </p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden" aria-label={`${BRAND.name} home`}>
          <Mark size={32} />
          <span className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">{BRAND.name}</span>
        </Link>
        <div className="auth-form-container w-full max-w-[400px] animate-enter">{children}</div>
      </main>
    </div>
  );
}
