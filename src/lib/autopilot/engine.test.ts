import { describe, expect, it } from "vitest";
import type { OHLCVCandle } from "@/lib/types";
import { assessGoal } from "./goal";
import {
  CANDLE_MS,
  FEE_RATE,
  SLIPPAGE_RATE,
  advance,
  createInitialState,
  equityOf,
  runBacktest,
  setPaused,
  stopSession,
  summarize,
} from "./engine";
import { evaluateSignal } from "./signal";
import type { AutopilotConfig, AutopilotState, Position } from "./types";

const SYM = "BTC/USD";
const T0 = 1_700_000_000_000 - (1_700_000_000_000 % CANDLE_MS);

const candle = (i: number, o: number, h: number, l: number, c: number): OHLCVCandle => ({
  timestamp: T0 + i * CANDLE_MS,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: 1,
});

const config = (over: Partial<AutopilotConfig> = {}): AutopilotConfig => ({
  startingBalance: 1000,
  targetBalance: 2000,
  horizonDays: 90,
  riskProfile: "BALANCED",
  symbols: [SYM],
  startedAt: T0,
  ...over,
});

const position = (over: Partial<Position> = {}): Position => ({
  id: "p1",
  symbol: SYM,
  entryPrice: 100,
  qty: 1,
  stop: 95,
  target: 110,
  openedAt: T0 - CANDLE_MS,
  entryFee: 0.1,
  initialRisk: 5,
  reason: "test",
  ...over,
});

/** A state holding one open position, with cash such that equity == startingBalance at price 100. */
function withPosition(over: Partial<Position> = {}, cfg = config()): AutopilotState {
  const s = createInitialState(cfg);
  const p = position(over);
  s.positions = [p];
  s.cash = cfg.startingBalance - p.qty * p.entryPrice;
  s.marks[SYM] = 100;
  return s;
}

describe("assessGoal", () => {
  it("flags doubling in 90 days as very unlikely and states the real monthly rate", () => {
    const g = assessGoal(1000, 2000, 90);
    expect(g.verdict).toBe("VERY_UNLIKELY");
    expect(g.requiredMonthlyPct).toBeCloseTo(25.99, 1);
    expect(g.requiredReturnPct).toBeCloseTo(100, 5);
  });

  it("treats a modest goal as plausible without promising it", () => {
    const g = assessGoal(1000, 1050, 60);
    expect(g.verdict).toBe("PLAUSIBLE");
    expect(g.message).toContain("nothing is guaranteed");
  });

  it("rejects bad input", () => {
    expect(assessGoal(1000, 900, 30).verdict).toBe("INVALID");
    expect(assessGoal(10, 100, 30).verdict).toBe("INVALID");
    expect(assessGoal(1000, 2000, 1).verdict).toBe("INVALID");
    expect(assessGoal(Number.NaN, 2000, 30).verdict).toBe("INVALID");
  });
});

describe("evaluateSignal", () => {
  it("stays silent without enough history", () => {
    const candles = Array.from({ length: 30 }, (_, i) => candle(i, 100, 101, 99, 100));
    expect(evaluateSignal(candles).enter).toBe(false);
  });
});

describe("exits", () => {
  it("takes the stop when stop and target both sit inside one candle", async () => {
    const out = await advance(withPosition(), config(), { [SYM]: [candle(0, 100, 111, 94, 100)] });
    expect(out.positions).toHaveLength(0);
    expect(out.closed[0].exitReason).toBe("STOP");
    expect(out.closed[0].exitPrice).toBeCloseTo(95 * (1 - SLIPPAGE_RATE), 6);
    expect(out.closed[0].pnl).toBeLessThan(0);
  });

  it("books a target at the target price with fees on both sides", async () => {
    const out = await advance(withPosition(), config(), { [SYM]: [candle(0, 100, 111, 99, 108)] });
    const t = out.closed[0];
    expect(t.exitReason).toBe("TARGET");
    expect(t.exitPrice).toBe(110);
    const expected = (110 - 100) * 1 - (0.1 + 110 * FEE_RATE);
    expect(t.pnl).toBeCloseTo(expected, 8);
  });

  it("exits at the open when price gaps through the stop", async () => {
    const out = await advance(withPosition(), config(), { [SYM]: [candle(0, 90, 92, 88, 91)] });
    expect(out.closed[0].exitPrice).toBeCloseTo(90 * (1 - SLIPPAGE_RATE), 6);
  });
});

describe("entries", () => {
  it("fills a pending entry at the NEXT candle's open, never the signal candle", async () => {
    const cfg = config();
    const s = createInitialState(cfg);
    s.pending = [{ symbol: SYM, signalAt: T0, atr: 1, reasons: ["test"], review: "" }];
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 101, 99, 100), candle(1, 102, 103, 101, 102)] });
    // candle 0 is the signal candle itself — pending must not fill on it.
    const fill = 102 * (1 + SLIPPAGE_RATE);
    expect(out.positions).toHaveLength(1);
    expect(out.positions[0].entryPrice).toBeCloseTo(fill, 8);
    expect(out.positions[0].openedAt).toBe(T0 + CANDLE_MS);
  });

  it("caps position size by risk, notional share, and available cash", async () => {
    const cfg = config(); // BALANCED: 1% risk, 45% max notional
    const s = createInitialState(cfg);
    s.pending = [{ symbol: SYM, signalAt: T0 - CANDLE_MS, atr: 0.1, reasons: ["test"], review: "" }];
    // Tiny ATR => risk-based size would be huge; the 45% notional cap must bind.
    // Candle stays inside the new stop (≈99.85) and target (≈100.45) so the position survives.
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 100.1, 99.9, 100)] });
    const p = out.positions[0];
    expect(p.qty * p.entryPrice).toBeLessThanOrEqual(450.0001);
    expect(out.cash).toBeGreaterThanOrEqual(0);
    expect(p.initialRisk).toBeLessThanOrEqual(10.0001);
  });

  it("cancels entries while paused", async () => {
    const cfg = config();
    const s = createInitialState(cfg);
    s.pending = [{ symbol: SYM, signalAt: T0 - CANDLE_MS, atr: 1, reasons: ["test"], review: "" }];
    const paused = setPaused(s, true, T0);
    // pausing clears pending outright
    expect(paused.pending).toHaveLength(0);
    expect(paused.status).toBe("PAUSED");
    const out = await advance(paused, cfg, { [SYM]: [candle(0, 100, 101, 99, 100)] });
    expect(out.positions).toHaveLength(0);
  });
});

describe("guardrails", () => {
  it("kill switch closes everything and halts at max drawdown", async () => {
    const cfg = config(); // 15% max drawdown
    const s = withPosition({ qty: 10, entryPrice: 100, stop: 10, target: 500 }, cfg);
    s.cash = 0;
    s.peakEquity = 1000;
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 100, 79, 80)] });
    expect(out.status).toBe("HALTED");
    expect(out.positions).toHaveLength(0);
    expect(out.closed[0].exitReason).toBe("KILL_SWITCH");
    expect(out.haltedReason).toContain("15%");
  });

  it("blocks new entries after the daily loss limit", async () => {
    const cfg = config(); // 3% daily
    const s = withPosition({ qty: 5, entryPrice: 100, stop: 1, target: 500 }, cfg);
    s.cash = 500;
    // equity falls to 500 + 5*93 = 965  (-3.5% on the day, < 15% drawdown)
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 100, 92, 93)] });
    expect(out.entriesBlockedForDay).toBe(true);
    expect(out.status).toBe("ACTIVE");
    expect(out.events.some((e) => e.kind === "GUARDRAIL")).toBe(true);
  });

  it("closes out and stops once the goal is reached", async () => {
    const cfg = config({ targetBalance: 1100 });
    const s = withPosition({ qty: 10, entryPrice: 100, stop: 50, target: 500 }, cfg);
    s.cash = 0;
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 125, 100, 120)] });
    expect(out.status).toBe("GOAL_REACHED");
    expect(out.positions).toHaveLength(0);
    expect(equityOf(out)).toBeGreaterThanOrEqual(1100 - 1);
  });
});

describe("session control", () => {
  it("stopSession flattens at the last mark and ends the session", () => {
    const s = withPosition();
    const out = stopSession(s, T0 + CANDLE_MS);
    expect(out.status).toBe("STOPPED");
    expect(out.positions).toHaveLength(0);
    expect(out.closed[0].exitReason).toBe("MANUAL");
  });

  it("does not trade candles that closed before the session started", async () => {
    const cfg = config({ startedAt: T0 + 5 * CANDLE_MS });
    const s = withPosition({}, cfg);
    const out = await advance(s, cfg, { [SYM]: [candle(0, 100, 200, 1, 100)] });
    expect(out.positions).toHaveLength(1);
    expect(out.closed).toHaveLength(0);
  });
});

/** Deterministic drifting-and-oscillating series that produces entry signals. */
function wavySeries(n: number): OHLCVCandle[] {
  const out: OHLCVCandle[] = [];
  let prev = 100;
  for (let i = 0; i < n; i++) {
    const close = 100 * Math.exp(0.0025 * i + 0.03 * Math.sin(i / 3) + 0.012 * Math.sin(i / 1.7));
    out.push(candle(i, prev, Math.max(prev, close) * 1.002, Math.min(prev, close) * 0.998, close));
    prev = close;
  }
  return out;
}

describe("full replay", () => {
  const candles = wavySeries(400);
  const cfg = config({ startedAt: candles[100].timestamp, targetBalance: 1_000_000_000 });

  it("produces signals on the synthetic series (test fixture sanity)", () => {
    let signals = 0;
    for (let i = 60; i < candles.length; i++) if (evaluateSignal(candles.slice(0, i + 1)).enter) signals++;
    expect(signals).toBeGreaterThan(0);
  });

  it("does not mutate the input state", async () => {
    const s = createInitialState(cfg);
    const snapshot = JSON.stringify(s);
    await advance(s, cfg, { [SYM]: candles });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("is deterministic and accounts for every dollar", async () => {
    const a = await advance(createInitialState(cfg), cfg, { [SYM]: candles });
    const b = await advance(createInitialState(cfg), cfg, { [SYM]: candles });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const realised = a.closed.reduce((sum, t) => sum + t.pnl, 0);
    const unrealised = a.positions.reduce((sum, p) => sum + (a.marks[p.symbol] - p.entryPrice) * p.qty - p.entryFee, 0);
    expect(equityOf(a)).toBeCloseTo(cfg.startingBalance + realised + unrealised, 6);
    expect(a.cash).toBeGreaterThanOrEqual(0);
  });

  it("replaying in two chunks equals one pass (catch-up is consistent)", async () => {
    const whole = await advance(createInitialState(cfg), cfg, { [SYM]: candles });
    const half = await advance(createInitialState(cfg), cfg, { [SYM]: candles.slice(0, 250) });
    const rest = await advance(half, cfg, { [SYM]: candles });
    expect(JSON.stringify(rest)).toBe(JSON.stringify(whole));
  });

  it("lets the AI reviewer veto an entry, and records why", async () => {
    const out = await advance(createInitialState(cfg), cfg, { [SYM]: candles }, {
      reviewEntry: async () => ({ approve: false, note: "Too extended" }),
    });
    expect(out.positions).toHaveLength(0);
    expect(out.closed).toHaveLength(0);
    expect(out.events.some((e) => e.kind === "ENTRY_VETOED" && e.message.includes("Too extended"))).toBe(true);
  });

  it("falls back to rules-only when the reviewer throws", async () => {
    const out = await advance(createInitialState(cfg), cfg, { [SYM]: candles }, {
      reviewEntry: async () => {
        throw new Error("model down");
      },
    });
    expect(out.events.some((e) => e.kind === "ENTRY_FILLED")).toBe(true);
    expect([...out.closed, ...out.positions].some((t) => t.reason.includes("rules only"))).toBe(true);
  });

  it("backtest runs the same engine and reports a coherent summary", async () => {
    const r = await runBacktest({
      symbols: [SYM],
      riskProfile: "BALANCED",
      startingBalance: 1000,
      candlesBySymbol: { [SYM]: candles },
      lookbackCandles: 300,
    });
    const sum = summarize(r.state, r.config);
    expect(sum.trades).toBe(r.state.closed.length);
    expect(sum.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(sum.totalFees).toBeGreaterThanOrEqual(0);
    if (sum.trades > 0) expect(sum.winRatePct).not.toBeNull();
  });
});
