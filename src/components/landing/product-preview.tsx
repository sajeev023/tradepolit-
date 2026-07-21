"use client";

import { useState, useEffect } from "react";
import { Lock, Activity } from "lucide-react";

const fullAiResponse =
  "Consolidating above support ($92,000). Bullish biased range continuation.\n\nRSI(14): 62.4 — Moderate strength, room to expand\nMACD: Confirmed crossover, positive expansion\nEMA 9/21: Defending support on 4H structure\n\nSupport: $92,000 · Resistance: $94,800\n\nVolume steady. Wait for 4H close above $93,000 before entries.";

const candlesticks = [
  { h: 35, t: "loss", w: 45 },
  { h: 25, t: "loss", w: 35 },
  { h: 48, t: "profit", w: 58 },
  { h: 55, t: "profit", w: 65 },
  { h: 40, t: "loss", w: 50 },
  { h: 62, t: "profit", w: 72 },
  { h: 75, t: "profit", w: 90 },
  { h: 58, t: "loss", w: 78 },
  { h: 80, t: "profit", w: 95 },
  { h: 90, t: "profit", w: 110 },
];

function LivePriceDisplay() {
  const [livePrice, setLivePrice] = useState(92450.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => parseFloat((prev + (Math.random() - 0.47) * 6).toFixed(2)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[11px] font-semibold font-mono text-[var(--color-text-primary)] tabular-nums">
      ${livePrice.toLocaleString()}
    </span>
  );
}

function DesktopLivePrice() {
  const [livePrice, setLivePrice] = useState(92450.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => parseFloat((prev + (Math.random() - 0.47) * 6).toFixed(2)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[12px] font-semibold font-mono text-[var(--color-text-primary)] tabular-nums">
      ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function TypedResponse() {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (index < fullAiResponse.length) {
        setTypedText(fullAiResponse.substring(0, index + 1));
        index++;
        timeout = setTimeout(tick, 18);
      } else {
        timeout = setTimeout(() => {
          index = 0;
          setTypedText("");
          timeout = setTimeout(tick, 6000);
        }, 6000);
      }
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="whitespace-pre-wrap text-[var(--color-text-secondary)] leading-[1.5]">
      {typedText}
      <span className="cursor-blink" />
    </div>
  );
}

export function MobileProductPreview() {
  return (
    <div className="block lg:hidden pt-4 animate-enter-delay-5">
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-deepest)]/90 backdrop-blur-2xl overflow-hidden shadow-xl shadow-black/60">
        <div className="flex items-center px-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] h-8 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500/80" />
            <span className="w-2 h-2 rounded-full bg-amber-500/80" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 mx-2 text-center">
            <span className="text-[8px] font-mono text-[var(--color-text-quaternary)]">tradepilot.ai</span>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold font-mono text-[var(--color-text-primary)]">BTC/USD</span>
              <span className="text-[8px] font-medium text-[var(--color-text-quaternary)] bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-1 py-0.5 rounded font-mono">4H</span>
            </div>
            <div className="text-right">
              <LivePriceDisplay />
              <span className="text-[9px] text-[var(--color-profit)] font-mono ml-1.5">+1.85%</span>
            </div>
          </div>
          <div className="relative flex items-end justify-between h-24 px-1 gap-[3px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] overflow-hidden mb-2">
            <div className="absolute inset-x-0 top-1/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
            <div className="absolute inset-x-0 top-2/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
            <div className="absolute inset-x-0 top-3/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
            {candlesticks.map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-px shrink-0"
                  style={{
                    height: `${c.w - c.h}px`,
                    backgroundColor: `var(--color-${c.t})`,
                  }}
                />
                <div
                  className="w-full max-w-[6px] rounded-sm"
                  style={{ height: `${c.h}px`, backgroundColor: `var(--color-${c.t})` }}
                />
                <div
                  className="w-px shrink-0"
                  style={{ height: "6px", backgroundColor: `var(--color-${c.t})` }}
                />
              </div>
            ))}
            <div className="absolute right-2 bottom-[60%] flex items-center">
              <span className="w-1 h-1 rounded-full bg-[var(--color-profit)] animate-ping absolute" />
              <span className="w-1 h-1 rounded-full bg-[var(--color-profit)]" />
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold text-[var(--color-text-primary)]">Bullish Bias</span>
                <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">
                  78% confidence
                </span>
              </div>
              <p className="text-[9px] leading-relaxed text-[var(--color-text-tertiary)]">
                Momentum strengthening above key support zone. Risk moderate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopProductPreview() {
  return (
    <div className="hero-mockup-desktop hidden sm:block lg:col-span-7 animate-enter-delay-2 relative z-10">
      <div className="relative rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-deepest)]/90 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/80">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[var(--color-accent-primary)] opacity-[0.08] rounded-full blur-[90px] pointer-events-none" />
        <div className="flex items-center px-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] h-9 select-none">
          <div className="flex items-center gap-1.5 w-14">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 max-w-[240px] mx-auto flex items-center justify-center gap-1.5 h-6 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-3">
            <Lock size={9} className="text-[var(--color-text-quaternary)]" />
            <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">tradepilot.ai/charts</span>
          </div>
          <div className="w-14" />
        </div>
        <div className="flex h-[360px]">
          <div className="hidden sm:flex flex-col items-center gap-3 py-4 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] w-10">
            <div className="w-5 h-5 rounded-md bg-[var(--color-accent-primary-muted)] flex items-center justify-center">
              <Activity size={10} className="text-[var(--color-accent-primary)]" />
            </div>
            {["W", "J", "A"].map((l) => (
              <div
                key={l}
                className="w-5 h-5 rounded-md bg-[var(--color-bg-primary)] flex items-center justify-center text-[8px] font-mono text-[var(--color-text-quaternary)]"
              >
                {l}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col p-3 bg-[var(--color-bg-deepest)]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-text-primary)] tracking-tight font-mono">
                  BTC/USD
                </span>
                <span className="text-[9px] font-medium text-[var(--color-text-quaternary)] bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded font-mono">
                  4H
                </span>
              </div>
              <div className="text-right flex items-center gap-2">
                <DesktopLivePrice />
                <span className="text-[10px] text-[var(--color-profit)] font-mono font-medium">+1.85%</span>
              </div>
            </div>
            <div className="flex-1 relative flex items-end justify-between px-1 gap-[3px] overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] rounded-lg p-2">
              <div className="absolute inset-x-0 top-1/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
              <div className="absolute inset-x-0 top-2/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
              <div className="absolute inset-x-0 top-3/4 h-px bg-[var(--color-border-subtle)] pointer-events-none" />
              {candlesticks.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-px shrink-0"
                    style={{
                      height: `${c.w - c.h}px`,
                      backgroundColor: `var(--color-${c.t})`,
                    }}
                  />
                  <div
                    className="w-full max-w-[8px] rounded-sm"
                    style={{ height: `${c.h}px`, backgroundColor: `var(--color-${c.t})` }}
                  />
                  <div
                    className="w-px shrink-0"
                    style={{ height: "8px", backgroundColor: `var(--color-${c.t})` }}
                  />
                </div>
              ))}
              <div className="absolute right-3 bottom-[94px] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-profit)] animate-ping absolute" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-profit)]" />
              </div>
            </div>
          </div>
          <div className="hidden md:flex w-[180px] sm:w-[220px] flex flex-col p-3 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]">
            <div className="flex items-center gap-1.5 border-b border-[var(--color-border-subtle)] pb-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)]" />
              <span className="text-[10px] font-semibold text-[var(--color-text-primary)] tracking-tight">
                TradePilot AI
              </span>
            </div>
            <div className="flex-1 overflow-y-auto text-[9px] leading-relaxed pr-1 space-y-3 font-mono text-[var(--color-text-tertiary)]">
              <div className="flex justify-end">
                <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] px-2 py-1 rounded-md text-[var(--color-text-primary)] text-[9px]">
                  Analyze BTC level
                </div>
              </div>
              <TypedResponse />
            </div>
            <div className="mt-2 border-t border-[var(--color-border-subtle)] pt-2">
              <div className="h-7 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] px-2 flex items-center text-[9px] text-[var(--color-text-quaternary)] font-mono">
                Ask about this chart...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
