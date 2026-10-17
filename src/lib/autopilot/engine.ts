import type { OHLCVCandle } from "@/lib/types";
import { RISK_PROFILES } from "./goal";
import { evaluateSignal, type Signal } from "./signal";
import type {
  AutopilotConfig,
  AutopilotEvent,
  AutopilotState,
  EntryReview,
  EntryReviewer,
  EventKind,
  ExitReason,
  PendingEntry,
  Position,
  RiskParams,
  SessionSummary,
} from "./types";

/** Strategy and simulation run on closed hourly candles. */
export const TIMEFRAME = "1h";
export const CANDLE_MS = 3_600_000;
/** Taker fee per side and adverse slippage on market-style fills. */
export const FEE_RATE = 0.001;
export const SLIPPAGE_RATE = 0.0005;
/** Smallest position worth opening, in quote currency. */
const MIN_NOTIONAL = 10;

const MAX_EVENTS = 300;
const MAX_CLOSED = 1000;
const MAX_CURVE = 600;

type CandleMap = Record<string, OHLCVCandle[]>;

export interface AdvanceOptions {
  reviewEntry?: EntryReviewer;
  /** Entry rules to use instead of the built-in ones — for research and tests. */
  evaluate?: (candles: OHLCVCandle[], symbol: string) => Signal;
}

const dayKeyOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export function createInitialState(config: AutopilotConfig): AutopilotState {
  return {
    cash: config.startingBalance,
    positions: [],
    pending: [],
    closed: [],
    marks: {},
    lastProcessed: {},
    peakEquity: config.startingBalance,
    dayKey: dayKeyOf(config.startedAt),
    dayStartEquity: config.startingBalance,
    entriesBlockedForDay: false,
    status: "ACTIVE",
    events: [
      {
        ts: config.startedAt,
        kind: "STATUS",
        message: `Paper session started with ${money(config.startingBalance)}. Goal ${money(config.targetBalance)} in ${config.horizonDays} days, ${config.riskProfile.toLowerCase()} risk.`,
      },
    ],
    equityCurve: [{ t: config.startedAt, e: config.startingBalance }],
  };
}

export function equityOf(state: AutopilotState): number {
  return state.positions.reduce((sum, p) => sum + p.qty * (state.marks[p.symbol] ?? p.entryPrice), state.cash);
}

function pushEvent(state: AutopilotState, ts: number, kind: EventKind, message: string, symbol?: string) {
  const event: AutopilotEvent = { ts, kind, message, ...(symbol ? { symbol } : {}) };
  state.events.push(event);
}

function closePosition(state: AutopilotState, pos: Position, exitPrice: number, ts: number, reason: ExitReason) {
  const proceeds = pos.qty * exitPrice;
  const exitFee = proceeds * FEE_RATE;
  const fees = pos.entryFee + exitFee;
  const pnl = (exitPrice - pos.entryPrice) * pos.qty - fees;
  state.cash += proceeds - exitFee;
  state.positions = state.positions.filter((p) => p.id !== pos.id);
  state.closed.push({
    id: pos.id,
    symbol: pos.symbol,
    entryPrice: pos.entryPrice,
    exitPrice,
    qty: pos.qty,
    openedAt: pos.openedAt,
    closedAt: ts,
    fees,
    pnl,
    rMultiple: pos.initialRisk > 0 ? pnl / pos.initialRisk : 0,
    exitReason: reason,
    reason: pos.reason,
  });
  const label = { STOP: "Stop hit", TARGET: "Target hit", KILL_SWITCH: "Kill switch", GOAL: "Goal reached", MANUAL: "Stopped by user" }[reason];
  pushEvent(state, ts, "EXIT", `${label}: sold ${pos.symbol} at ${exitPrice.toFixed(2)} for ${pnl >= 0 ? "+" : "−"}${money(Math.abs(pnl))} after fees.`, pos.symbol);
}

/** Flatten every position at its last mark, with the same slippage a market exit would pay. */
function closeAll(state: AutopilotState, ts: number, reason: ExitReason) {
  for (const pos of [...state.positions]) {
    const mark = state.marks[pos.symbol] ?? pos.entryPrice;
    closePosition(state, pos, mark * (1 - SLIPPAGE_RATE), ts, reason);
  }
  state.pending = [];
}

function cancelPending(state: AutopilotState, p: PendingEntry, ts: number, why: string) {
  pushEvent(state, ts, "ENTRY_CANCELLED", `Entry on ${p.symbol} cancelled: ${why}.`, p.symbol);
}

function fillEntry(state: AutopilotState, risk: RiskParams, p: PendingEntry, c: OHLCVCandle) {
  if (state.status !== "ACTIVE") return cancelPending(state, p, c.timestamp, "session is not active");
  if (state.entriesBlockedForDay) return cancelPending(state, p, c.timestamp, "daily loss limit reached");
  if (state.positions.length >= risk.maxOpenPositions) return cancelPending(state, p, c.timestamp, "max open positions reached");

  const fill = c.open * (1 + SLIPPAGE_RATE);
  const stopDist = p.atr * risk.stopAtrMultiple;
  const stop = fill - stopDist;
  if (!(stop > 0)) return cancelPending(state, p, c.timestamp, "stop would be below zero");

  const equity = equityOf(state);
  const qty = Math.min(
    (equity * risk.riskPerTradePct) / 100 / stopDist,
    (equity * risk.maxPositionPct) / 100 / fill,
    state.cash / (fill * (1 + FEE_RATE)),
  );
  if (!(qty * fill >= MIN_NOTIONAL)) return cancelPending(state, p, c.timestamp, "position too small after risk limits");

  const entryFee = qty * fill * FEE_RATE;
  state.cash -= qty * fill + entryFee;
  const position: Position = {
    id: `${p.symbol}-${c.timestamp}`,
    symbol: p.symbol,
    entryPrice: fill,
    qty,
    stop,
    target: fill + stopDist * risk.rewardRisk,
    openedAt: c.timestamp,
    entryFee,
    initialRisk: qty * stopDist,
    reason: p.review ? `${p.reasons.join(" · ")} · ${p.review}` : p.reasons.join(" · "),
  };
  state.positions.push(position);
  pushEvent(
    state,
    c.timestamp,
    "ENTRY_FILLED",
    `Bought ${qty.toPrecision(4)} ${p.symbol} at ${fill.toFixed(2)} (${money(qty * fill)}). Stop ${stop.toFixed(2)}, target ${position.target.toFixed(2)}, risking ${money(position.initialRisk)}.`,
    p.symbol,
  );
}

/** Stops win over targets when both sit inside one candle — the pessimistic assumption. */
function checkExit(state: AutopilotState, pos: Position, c: OHLCVCandle) {
  if (c.open <= pos.stop) return closePosition(state, pos, c.open * (1 - SLIPPAGE_RATE), c.timestamp, "STOP");
  if (c.low <= pos.stop) return closePosition(state, pos, pos.stop * (1 - SLIPPAGE_RATE), c.timestamp, "STOP");
  if (c.open >= pos.target) return closePosition(state, pos, c.open, c.timestamp, "TARGET");
  if (c.high >= pos.target) return closePosition(state, pos, pos.target, c.timestamp, "TARGET");
}

function recordCurve(state: AutopilotState, t: number, equity: number) {
  state.equityCurve.push({ t, e: equity });
  if (state.equityCurve.length > MAX_CURVE) {
    state.equityCurve = state.equityCurve.filter((_, i, a) => i % 2 === 0 || i === a.length - 1);
  }
}

/** Returns true when the session has ended and no more trading should happen. */
function applyGuardrails(state: AutopilotState, config: AutopilotConfig, risk: RiskParams, ts: number): boolean {
  const equity = equityOf(state);
  if (equity >= config.targetBalance) {
    closeAll(state, ts, "GOAL");
    state.status = "GOAL_REACHED";
    pushEvent(state, ts, "STATUS", `Goal reached: equity ${money(equityOf(state))} ≥ target ${money(config.targetBalance)}. Session closed.`);
    return true;
  }
  if (equity <= state.peakEquity * (1 - risk.maxDrawdownPct / 100)) {
    closeAll(state, ts, "KILL_SWITCH");
    state.status = "HALTED";
    state.haltedReason = `Max drawdown ${risk.maxDrawdownPct}% from peak ${money(state.peakEquity)} reached`;
    pushEvent(state, ts, "GUARDRAIL", `Kill switch: ${state.haltedReason}. All positions closed, trading halted.`);
    return true;
  }
  if (!state.entriesBlockedForDay && equity <= state.dayStartEquity * (1 - risk.maxDailyLossPct / 100)) {
    state.entriesBlockedForDay = true;
    state.pending = [];
    pushEvent(state, ts, "GUARDRAIL", `Daily loss limit (${risk.maxDailyLossPct}%) reached. No new entries until the next UTC day.`);
  }
  return false;
}

async function requestReview(reviewer: EntryReviewer | undefined, req: Parameters<EntryReviewer>[0]): Promise<EntryReview> {
  if (!reviewer) return { approve: true, note: "" };
  try {
    return await reviewer(req);
  } catch {
    return { approve: true, note: "AI review unavailable — rules only" };
  }
}

async function processCandle(
  state: AutopilotState,
  config: AutopilotConfig,
  risk: RiskParams,
  symbol: string,
  candles: OHLCVCandle[],
  index: number,
  opts: AdvanceOptions,
) {
  const c = candles[index];
  const closeTs = c.timestamp + CANDLE_MS;
  state.lastProcessed[symbol] = c.timestamp;

  if (state.status !== "ACTIVE" && state.status !== "PAUSED") {
    state.marks[symbol] = c.close;
    return;
  }

  const pendingIdx = state.pending.findIndex((p) => p.symbol === symbol && p.signalAt < c.timestamp);
  if (pendingIdx >= 0) {
    const [pending] = state.pending.splice(pendingIdx, 1);
    if (state.status === "PAUSED") cancelPending(state, pending, c.timestamp, "session is paused");
    else fillEntry(state, risk, pending, c);
  }

  const open = state.positions.find((p) => p.symbol === symbol);
  if (open) checkExit(state, open, c);

  state.marks[symbol] = c.close;
  const equity = equityOf(state);
  const key = dayKeyOf(closeTs);
  if (key !== state.dayKey) {
    state.dayKey = key;
    state.dayStartEquity = equity;
    state.entriesBlockedForDay = false;
  }
  state.peakEquity = Math.max(state.peakEquity, equity);
  recordCurve(state, closeTs, equity);

  if (applyGuardrails(state, config, risk, closeTs)) return;
  if (state.status !== "ACTIVE" || state.entriesBlockedForDay) return;
  if (state.positions.some((p) => p.symbol === symbol) || state.pending.some((p) => p.symbol === symbol)) return;
  if (state.positions.length + state.pending.length >= risk.maxOpenPositions) return;

  const signal = (opts.evaluate ?? evaluateSignal)(candles.slice(Math.max(0, index - 199), index + 1), symbol);
  if (!signal.enter) return;

  pushEvent(state, closeTs, "ENTRY_SIGNAL", `Signal on ${symbol} at ${c.close.toFixed(2)}: ${signal.reasons.join("; ")}.`, symbol);
  const review = await requestReview(opts.reviewEntry, { symbol, closedAt: closeTs, price: c.close, atr: signal.atr, reasons: signal.reasons });
  if (!review.approve) {
    pushEvent(state, closeTs, "ENTRY_VETOED", `AI review vetoed ${symbol}: ${review.note}`, symbol);
    return;
  }
  state.pending.push({ symbol, signalAt: c.timestamp, atr: signal.atr, reasons: signal.reasons, review: review.note });
}

function trim(state: AutopilotState) {
  if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
  if (state.closed.length > MAX_CLOSED) state.closed = state.closed.slice(-MAX_CLOSED);
}

/**
 * Replay every CLOSED candle the session has not seen yet, in time order.
 * Signals use only data up to the candle's close; entries fill at the NEXT
 * candle's open. Returns a new state — the input is never mutated.
 */
export async function advance(
  prev: AutopilotState,
  config: AutopilotConfig,
  candlesBySymbol: CandleMap,
  opts: AdvanceOptions = {},
): Promise<AutopilotState> {
  const state = structuredClone(prev);
  const risk = RISK_PROFILES[config.riskProfile];

  const queue: Array<{ symbol: string; index: number; ts: number }> = [];
  for (const symbol of config.symbols) {
    const candles = candlesBySymbol[symbol] ?? [];
    const after = Math.max(state.lastProcessed[symbol] ?? -Infinity, config.startedAt - 1);
    candles.forEach((c, index) => {
      if (c.timestamp > after) queue.push({ symbol, index, ts: c.timestamp });
    });
  }
  queue.sort((a, b) => a.ts - b.ts || a.symbol.localeCompare(b.symbol));

  for (const item of queue) {
    await processCandle(state, config, risk, item.symbol, candlesBySymbol[item.symbol], item.index, opts);
  }
  trim(state);
  return state;
}

/** Flatten everything at the last mark and end the session. */
export function stopSession(prev: AutopilotState, ts: number): AutopilotState {
  const state = structuredClone(prev);
  if (state.status === "STOPPED" || state.status === "GOAL_REACHED" || state.status === "HALTED") return state;
  closeAll(state, ts, "MANUAL");
  state.status = "STOPPED";
  pushEvent(state, ts, "STATUS", `Session stopped by you. Final equity ${money(equityOf(state))}.`);
  return state;
}

export function setPaused(prev: AutopilotState, paused: boolean, ts: number): AutopilotState {
  const state = structuredClone(prev);
  if (paused && state.status === "ACTIVE") {
    state.status = "PAUSED";
    state.pending = [];
    pushEvent(state, ts, "STATUS", "Paused. No new entries; open positions keep their stops and targets.");
  } else if (!paused && state.status === "PAUSED") {
    state.status = "ACTIVE";
    pushEvent(state, ts, "STATUS", "Resumed.");
  }
  return state;
}

export function summarize(state: AutopilotState, config: AutopilotConfig): SessionSummary {
  const equity = equityOf(state);
  const wins = state.closed.filter((t) => t.pnl > 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = state.closed.filter((t) => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0);

  let peak = config.startingBalance;
  let maxDd = 0;
  for (const point of state.equityCurve) {
    peak = Math.max(peak, point.e);
    maxDd = Math.max(maxDd, ((peak - point.e) / peak) * 100);
  }

  const span = config.targetBalance - config.startingBalance;
  return {
    equity,
    returnPct: (equity / config.startingBalance - 1) * 100,
    progressToGoalPct: span > 0 ? ((equity - config.startingBalance) / span) * 100 : 0,
    trades: state.closed.length,
    wins: wins.length,
    winRatePct: state.closed.length ? (wins.length / state.closed.length) * 100 : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    maxDrawdownPct: maxDd,
    totalFees: state.closed.reduce((s, t) => s + t.fees, 0) + state.positions.reduce((s, p) => s + p.entryFee, 0),
    openPositions: state.positions.length,
  };
}

export interface BacktestInput {
  symbols: string[];
  riskProfile: AutopilotConfig["riskProfile"];
  startingBalance: number;
  candlesBySymbol: CandleMap;
  /** How many of the most recent candles to trade through; earlier ones only warm up indicators. */
  lookbackCandles: number;
}

/**
 * Run the exact live engine over recent real history. This is what the rules
 * WOULD have done — a sanity check, never a promise about the future.
 */
export async function runBacktest(input: BacktestInput) {
  const anchor = input.candlesBySymbol[input.symbols[0]] ?? [];
  const startAt = anchor[Math.max(0, anchor.length - input.lookbackCandles)]?.timestamp ?? 0;
  const config: AutopilotConfig = {
    startingBalance: input.startingBalance,
    targetBalance: input.startingBalance * 1_000_000,
    horizonDays: Math.max(1, Math.round((input.lookbackCandles * CANDLE_MS) / 86_400_000)),
    riskProfile: input.riskProfile,
    symbols: input.symbols,
    startedAt: startAt,
  };
  const state = await advance(createInitialState(config), config, input.candlesBySymbol);
  return { config, state, summary: summarize(state, config) };
}
