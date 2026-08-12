"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Lock, Activity, BookOpen, Bell, BarChart3, Sparkles } from "lucide-react";
import { useBinanceStream, useBinanceStreamStatus } from "@/hooks/useBinanceStream";
import { Sparkline } from "@/components/ui/sparkline";
import { formatPrice } from "./live-price";

/* ═══════════════════════════════════════════════════════════════════════
   HeroTerminal — the product IS the hero.

   A living, Binance-WS-driven trading terminal rendered in real product
   chrome. No Math.random, no fabricated candles: the chart is a live tick
   ring-buffer sparkline (honest "live price"), the telemetry strip shows
   real 24h high/low/volume, and the AI setup levels are derived from the
   real 24h range and explicitly labelled illustrative. The typed AI
   readout is a static demonstration of output format ("demo output").
   ═══════════════════════════════════════════════════════════════════════ */

const AI_RESPONSE =
  "Consolidating above 24h support. Bullish-biased range continuation.\n\nRSI(14): 62.4 — moderate strength, room to expand\nMACD: confirmed crossover, positive expansion\nEMA 9/21: defending structure on the 4H\n\nVolume steady. Wait for a confirmed 4H close above resistance before entries.";

const SYMBOL = "BTC/USD";
const RING_MAX = 60;

/* ── Typed AI readout (static demo of output format) ── */
function TypedResponse() {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.hidden) {
        timeout = setTimeout(tick, 200);
        return;
      }
      if (index < AI_RESPONSE.length) {
        setTyped(AI_RESPONSE.substring(0, index + 1));
        index++;
        timeout = setTimeout(tick, 38);
      } else {
        timeout = setTimeout(() => {
          index = 0;
          setTyped("");
          timeout = setTimeout(tick, 5200);
        }, 5200);
      }
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="whitespace-pre-wrap text-[var(--color-text-secondary)] leading-[1.55] text-[10px] font-mono">
      {typed}
      <span className="cursor-blink" />
    </div>
  );
}

/* ── Live chart — isolates WS re-renders to this component only ──
   Subscribes to BTC/USD, buffers the last N ticks, renders a sparkline.
   The 24h high/low/volume telemetry strip is co-located so the rest of
   the terminal never re-renders on a price tick. */
function LiveChart({ compact = false }: { compact?: boolean }) {
  const data = useBinanceStream(SYMBOL);
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState("");
  const [ring, setRing] = useState<number[]>([]);

  useEffect(() => {
    if (data == null) return;
    // tick flash
    if (prev.current != null && data.price !== prev.current) {
      setFlash(data.price > prev.current ? "tick-flash-up" : "tick-flash-down");
      const t = setTimeout(() => setFlash(""), 340);
      prev.current = data.price;
      setRing((r) => {
        const next = [...r, data.price];
        return next.length > RING_MAX ? next.slice(next.length - RING_MAX) : next;
      });
      return () => clearTimeout(t);
    }
    prev.current = data.price;
    // first point
    setRing((r) => (r.length === 0 ? [data.price] : r));
  }, [data]);

  const change = data?.changePercent24h ?? 0;
  const up = change >= 0;
  const height = compact ? 120 : 168;

  return (
    <div className="flex flex-col h-full">
      {/* Symbol header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold font-mono text-[var(--color-text-primary)] tracking-tight">{SYMBOL}</span>
          <span className="badge badge-info !text-[9px] !px-1.5 !py-0">4H</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono font-semibold tabular-nums text-[12px] text-[var(--color-text-primary)] rounded px-1 ${flash}`}>
            {data ? `$${formatPrice(data.price)}` : "—"}
          </span>
          <span className={`text-[10px] font-mono font-medium tabular-nums ${data ? (up ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]") : "text-[var(--color-text-quaternary)]"}`}>
            {data ? `${up ? "+" : ""}${change.toFixed(2)}%` : "···"}
          </span>
        </div>
      </div>

      {/* Chart pane */}
      <div className={`terminal-grid relative flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[rgba(3,7,18,0.5)] overflow-hidden ${compact ? "min-h-[120px]" : "min-h-[168px]"}`}>
        {/* horizontal reference lines */}
        <div className="absolute inset-x-0 top-1/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
        <div className="absolute inset-x-0 top-2/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
        <div className="absolute inset-x-0 top-3/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />

        {ring.length >= 2 ? (
          <div className="absolute inset-0 flex items-center px-2">
            <Sparkline points={ring} width={520} height={height} className="w-full h-full" fillId="hero-spark" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="tp-micro-label flex items-center gap-2">
              <span className="ping-dot" /> connecting to binance…
            </span>
          </div>
        )}

        {/* 24h range tags */}
        {data && (
          <>
            <span className="absolute top-1.5 right-2 tp-micro-label" style={{ color: "var(--color-text-quaternary)" }}>
              H ${formatPrice(data.high24h)}
            </span>
            <span className="absolute bottom-1.5 right-2 tp-micro-label" style={{ color: "var(--color-text-quaternary)" }}>
              L ${formatPrice(data.low24h)}
            </span>
          </>
        )}
      </div>

      {/* Telemetry strip — real 24h stats */}
      <div className="flex items-center gap-3 mt-2.5 text-[10px] font-mono">
        <span className="tp-micro-label">24H</span>
        <span className="text-[var(--color-text-tertiary)]">HIGH <span className="text-[var(--color-text-secondary)] tabular-nums">{data ? `$${formatPrice(data.high24h)}` : "—"}</span></span>
        <span className="text-[var(--color-text-tertiary)]">LOW <span className="text-[var(--color-text-secondary)] tabular-nums">{data ? `$${formatPrice(data.low24h)}` : "—"}</span></span>
        <span className="text-[var(--color-text-tertiary)] hidden sm:inline">VOL <span className="text-[var(--color-text-secondary)] tabular-nums">{data ? Math.round(data.volume24h).toLocaleString() : "—"}</span></span>
      </div>
    </div>
  );
}

/* ── AI setup card — levels derived from the real 24h range, labelled illustrative ── */
function AiSetupCard() {
  const data = useBinanceStream(SYMBOL);
  const levels = useMemo(() => {
    if (!data) return null;
    const support = data.low24h;
    const resistance = data.high24h;
    const mid = (support + resistance) / 2;
    const entry = mid;
    const stop = support - (resistance - support) * 0.15;
    const tp = resistance;
    const rr = (tp - entry) / (entry - stop);
    return { support, resistance, entry, stop, tp, rr };
    // Granular deps intentional: recompute only when 24h levels change,
    // not on every tick (data identity changes each WS message).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.high24h, data?.low24h]);

  return (
    <div className="terminal-pane p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="ping-dot" />
          <span className="text-[10px] font-semibold text-[var(--color-text-primary)] tracking-tight uppercase">Completed AI Setup</span>
        </div>
        <span className="tp-micro-label" style={{ color: "var(--color-profit)" }}>88% · illustrative</span>
      </div>
      <div className="grid grid-cols-3 gap-2 font-mono text-[9.5px]">
        <div>
          <div className="tp-micro-label !text-[8px]">Entry</div>
          <div className="text-[var(--color-text-primary)] font-semibold tabular-nums">{levels ? `$${formatPrice(levels.entry)}` : "—"}</div>
        </div>
        <div>
          <div className="tp-micro-label !text-[8px]">Stop</div>
          <div className="text-[var(--color-loss)] font-semibold tabular-nums">{levels ? `$${formatPrice(levels.stop)}` : "—"}</div>
        </div>
        <div>
          <div className="tp-micro-label !text-[8px]">Target</div>
          <div className="text-[var(--color-profit)] font-semibold tabular-nums">{levels ? `$${formatPrice(levels.tp)}` : "—"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-border-subtle)] font-mono text-[9px]">
        <span className="text-[var(--color-text-tertiary)]">Bias</span>
        <span className="text-[var(--color-profit)] font-bold">BULLISH · {levels ? `${levels.rr.toFixed(1)}R` : "—"}</span>
      </div>
    </div>
  );
}

/* ── Terminal titlebar with live WS status pill ── */
function TerminalTitlebar() {
  const status = useBinanceStreamStatus(SYMBOL);
  const live = status === "connected";
  return (
    <div className="flex items-center px-3.5 h-9 border-b border-[var(--color-border-default)] bg-[var(--color-bg-deepest)] select-none">
      <div className="flex items-center gap-1.5 w-16">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-loss)", opacity: 0.85 }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-warning)", opacity: 0.85 }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-profit)", opacity: 0.85 }} />
      </div>
      <div className="flex-1 max-w-[260px] mx-auto flex items-center justify-center gap-1.5 h-6 rounded-md bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] px-3">
        <Lock size={9} style={{ color: "var(--color-text-quaternary)" }} />
        <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">tradcopilot.com/charts</span>
      </div>
      <div className="w-16 flex justify-end">
        <span
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold"
          style={{
            color: live ? "var(--color-accent-primary)" : "var(--color-warning)",
            background: live ? "var(--color-accent-primary-subtle)" : "var(--color-warning-bg)",
            border: `1px solid ${live ? "rgba(6,182,212,0.2)" : "rgba(245,158,11,0.2)"}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: live ? "var(--color-accent-primary)" : "var(--color-warning)" }} />
          {live ? "LIVE" : "LINK"}
        </span>
      </div>
    </div>
  );
}

const RAIL_ITEMS = [
  { icon: <Activity size={11} />, label: "Charts" },
  { icon: <BookOpen size={11} />, label: "Journal" },
  { icon: <Bell size={11} />, label: "Alerts" },
  { icon: <BarChart3 size={11} />, label: "Analytics" },
];

/* ── Desktop hero terminal ── */
export function DesktopProductPreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enableParallax, setEnableParallax] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnableParallax(fine && !reduced);
  }, []);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.5]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 5]);

  return (
    <div
      ref={wrapRef}
      className="hero-mockup-desktop hidden lg:block lg:col-span-7 animate-enter-delay-2 relative z-10"
      style={{ perspective: 1600 }}
    >
      <motion.div
        style={enableParallax ? { y, opacity, rotateX } : undefined}
        className="terminal-chrome"
      >
        <TerminalTitlebar />
        <div className="flex h-[372px]">
          {/* Icon rail */}
          <div className="hidden sm:flex flex-col items-center gap-2.5 py-4 border-r border-[var(--color-border-default)] bg-[var(--color-bg-deepest)] w-11">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--color-accent-primary-subtle)", border: "1px solid rgba(6,182,212,0.18)", color: "var(--color-accent-primary)" }}>
              <Activity size={13} />
            </div>
            {RAIL_ITEMS.slice(1).map((r) => (
              <div key={r.label} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-quaternary)] border border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-hover)] transition-colors">
                {r.icon}
              </div>
            ))}
          </div>

          {/* Chart pane */}
          <div className="flex-1 flex flex-col p-3.5 bg-[rgba(3,7,18,0.4)]">
            <LiveChart />
            <div className="mt-3">
              <AiSetupCard />
            </div>
          </div>

          {/* Copilot pane */}
          <div className="hidden md:flex w-[236px] flex-col p-3 border-l border-[var(--color-border-default)] bg-[var(--color-bg-deepest)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} style={{ color: "var(--color-accent-primary)" }} />
                <span className="text-[10px] font-semibold text-[var(--color-text-primary)] tracking-tight">AI Copilot</span>
              </div>
              <span className="tp-micro-label !text-[8px]">demo output</span>
            </div>
            <div className="flex-1 overflow-hidden pr-0.5">
              <TypedResponse />
            </div>
            <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-2">
              <div className="h-7 rounded-md bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] px-2.5 flex items-center text-[9.5px] text-[var(--color-text-quaternary)] font-mono">
                Ask copilot about this trade…
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Mobile hero terminal — recomposed, not shrunk ── */
export function MobileProductPreview() {
  return (
    <div className="block lg:hidden pt-5 animate-enter-delay-5">
      <div className="terminal-chrome">
        <TerminalTitlebar />
        <div className="p-3 bg-[rgba(3,7,18,0.4)]">
          <LiveChart compact />
          <div className="mt-3">
            <AiSetupCard />
          </div>
          <div className="mt-3 terminal-pane p-2.5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} style={{ color: "var(--color-accent-primary)" }} />
                <span className="text-[10px] font-semibold text-[var(--color-text-primary)]">AI Copilot</span>
              </div>
              <span className="tp-micro-label !text-[8px]">demo output</span>
            </div>
            <TypedResponse />
          </div>
        </div>
      </div>
    </div>
  );
}