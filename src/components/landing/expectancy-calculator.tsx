"use client";

import { useMemo, useState } from "react";

/* Expectancy (per trade, in R):
   E = (winRate · rr) − (lossRate · 1)   where lossRate = 1 − winRate.
   Weekly outcome = trades · E (in R), plus a dollar equivalent at an
   illustrative $100 risk per trade (clearly labeled). */
function expectancyR(winRate: number, rr: number): number {
  const w = winRate / 100;
  return w * rr - (1 - w) * 1;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[12px] font-mono uppercase tracking-wider text-[var(--muted)]">
          {label}
        </label>
        <span className="tp-mono text-[15px] font-semibold text-[var(--ink)] tabular-nums">
          {value}
          <span className="text-[var(--muted)] text-[12px] ml-0.5">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="tc-range w-full"
        aria-label={label}
      />
    </div>
  );
}

export function ExpectancyCalculator() {
  const [winRate, setWinRate] = useState(55);
  const [rr, setRr] = useState(2);
  const [trades, setTrades] = useState(20);

  const { perTrade, weeklyR, weeklyUsd, positive } = useMemo(() => {
    const perTrade = expectancyR(winRate, rr);
    const weeklyR = trades * perTrade;
    const weeklyUsd = weeklyR * 100; // illustrative $100 risk per trade
    return { perTrade, weeklyR, weeklyUsd, positive: weeklyR >= 0 };
  }, [winRate, rr, trades]);

  return (
    <div className="tc-card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="tc-card__badge">Expectancy calculator</span>
          <h3 className="tp-h3 mt-1">Pressure-test your edge</h3>
        </div>
        <span className="tc-status-chip tc-status-chip--accent">
          <span className="tc-status-chip__dot tc-status-chip__dot--pulse" /> Live
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mb-5">
        <Slider label="Win rate" value={winRate} min={10} max={90} step={1} unit="%" onChange={setWinRate} />
        <Slider label="Risk : Reward" value={rr} min={0.5} max={5} step={0.1} unit="R" onChange={setRr} />
        <Slider label="Trades / week" value={trades} min={1} max={100} step={1} unit="" onChange={setTrades} />
      </div>

      <div className="tc-card__divider" />

      <div className="grid grid-cols-3 gap-4 pt-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Per trade</div>
          <div className="tp-mono text-xl font-semibold text-[var(--ink)] tabular-nums">
            {perTrade >= 0 ? "+" : ""}{perTrade.toFixed(2)}R
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Weekly</div>
          <div className={`tp-mono text-xl font-semibold tabular-nums ${positive ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {weeklyR >= 0 ? "+" : ""}{weeklyR.toFixed(1)}R
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Weekly $</div>
          <div className={`tp-mono text-xl font-semibold tabular-nums ${positive ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {weeklyUsd >= 0 ? "+" : "−"}${Math.abs(weeklyUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-[var(--muted)] font-mono leading-relaxed">
        Illustrative — assumes $100 risk per trade. Expectancy = (winRate · R:R) − (lossRate · 1). Not financial advice.
      </p>
    </div>
  );
}