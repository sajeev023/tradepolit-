import { prisma } from "@/lib/prisma";
import { getOHLCV } from "@/lib/market";
import { callFastestAIModel } from "@/lib/ai-providers";
import { CRYPTO_SYMBOLS } from "@/lib/market-registry";
import type { OHLCVCandle } from "@/lib/types";
import {
  CANDLE_MS,
  TIMEFRAME,
  advance,
  createInitialState,
  setPaused,
  stopSession,
} from "./engine";
import { SUPPORTED_SYMBOLS } from "./goal";
import type { AutopilotConfig, AutopilotState, EntryReviewer, RiskProfile } from "./types";

/** Crypto spot pairs with real Binance candles. Autopilot never trades simulated data. */
export const AUTOPILOT_SYMBOLS: string[] = SUPPORTED_SYMBOLS.filter((s) => CRYPTO_SYMBOLS.includes(s));
export const MAX_SESSIONS_PER_USER = 3;

/**
 * ~41 days of hourly candles (Binance's per-request maximum): 200 to warm the
 * trend average, the rest available for catch-up if the user is away.
 */
const CANDLE_HISTORY = 1000;
const MAX_AI_REVIEWS_PER_TICK = 4;
/** A signal older than this is a replay of history, not a live decision. */
const LIVE_EDGE_MS = 2 * CANDLE_MS;

export interface SessionRow {
  id: string;
  userId: string;
  name: string;
  status: string;
  startingBalance: number;
  targetBalance: number;
  config: AutopilotConfig;
  state: AutopilotState;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionLimitError extends Error {}
export class DataUnavailableError extends Error {}

/** Closed hourly candles, ascending. Throws if any provider fell back to simulated data. */
async function loadClosedCandles(symbols: string[]): Promise<Record<string, OHLCVCandle[]>> {
  const now = Date.now();
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const candles = await getOHLCV(symbol, TIMEFRAME, CANDLE_HISTORY);
      if (candles.length === 0 || candles.some((c) => c.source === "SIMULATED")) {
        throw new DataUnavailableError(`Live ${symbol} candles are unavailable right now, so Autopilot is not trading. It will catch up when data returns.`);
      }
      const closed = candles.filter((c) => c.timestamp + CANDLE_MS <= now).sort((a, b) => a.timestamp - b.timestamp);
      return [symbol, closed] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function parseReview(raw: string): { approve: boolean; reason: string } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { approve?: unknown; reason?: unknown };
    if (typeof parsed.approve !== "boolean") return null;
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 160) : "";
    return { approve: parsed.approve, reason: reason || "no reason given" };
  } catch {
    return null;
  }
}

/**
 * Optional second opinion from the AI models on live entries only. The rules
 * decide WHAT to trade; the model can only veto. It sees the same numbers the
 * rules saw — nothing else — and its answer is logged verbatim. If no model is
 * reachable the entry proceeds on rules alone and the log says so.
 */
function makeReviewer(): EntryReviewer {
  let used = 0;
  return async (req) => {
    if (Date.now() - req.closedAt > LIVE_EDGE_MS) return { approve: true, note: "" };
    if (used >= MAX_AI_REVIEWS_PER_TICK) return { approve: true, note: "rules only (AI review limit reached)" };
    used++;

    const atrPct = ((req.atr / req.price) * 100).toFixed(2);
    const result = await callFastestAIModel(
      [
        {
          role: "system",
          content:
            "You review long entries for a paper-trading bot. A fixed rule set already chose this entry. " +
            "Veto ONLY for a clear problem visible in the facts given (e.g. price stretched far above the trend, unusually high volatility). " +
            "You cannot see news or anything beyond the facts. Never invent data. " +
            'Reply with ONLY JSON: {"approve": true|false, "reason": "<max 140 chars>"}',
        },
        {
          role: "user",
          content: `Symbol ${req.symbol}, price ${req.price}, 1h ATR ${atrPct}% of price.\nRule triggers:\n- ${req.reasons.join("\n- ")}`,
        },
      ],
      { maxTokens: 160, temperature: 0.1 },
    );

    const review = parseReview(result.content);
    if (!review) return { approve: true, note: "AI reply unreadable — rules only" };
    return review.approve ? { approve: true, note: `AI review: ${review.reason}` } : { approve: false, note: review.reason };
  };
}

/** Candles older than the fetch window are gone; say so rather than pretend they were watched. */
function withGapNotes(state: AutopilotState, config: AutopilotConfig, candles: Record<string, OHLCVCandle[]>): AutopilotState {
  const events = [...state.events];
  for (const symbol of config.symbols) {
    const last = state.lastProcessed[symbol];
    const first = candles[symbol]?.[0]?.timestamp;
    if (last === undefined || first === undefined || first <= last + CANDLE_MS) continue;
    const missed = Math.round((first - last) / CANDLE_MS) - 1;
    events.push({
      ts: Date.now(),
      kind: "STATUS",
      symbol,
      message: `${missed} hourly ${symbol} candles fell outside the available data window and were not simulated. Stops and targets could not be checked for that stretch.`,
    });
  }
  return events.length === state.events.length ? state : { ...state, events };
}

/**
 * Bring a session up to date with every closed candle since it last ran.
 * Safe to call as often as you like: processing is incremental and
 * deterministic, so repeated calls with no new candles change nothing.
 */
export async function tickSession(row: SessionRow): Promise<{ row: SessionRow; warning?: string }> {
  if (row.state.status !== "ACTIVE" && row.state.status !== "PAUSED") return { row };

  let candles: Record<string, OHLCVCandle[]>;
  try {
    candles = await loadClosedCandles(row.config.symbols);
  } catch (err) {
    if (err instanceof DataUnavailableError) return { row, warning: err.message };
    throw err;
  }

  const base = withGapNotes(row.state, row.config, candles);
  const next = await advance(base, row.config, candles, { reviewEntry: makeReviewer() });
  const changed = JSON.stringify(next.lastProcessed) !== JSON.stringify(row.state.lastProcessed) || next.events.length !== row.state.events.length;
  if (!changed) return { row };

  const saved = await prisma.autopilotSession.update({
    where: { id: row.id },
    data: { state: next as never, status: next.status },
  });
  return { row: toRow(saved) };
}

function toRow(raw: Record<string, unknown>): SessionRow {
  return raw as unknown as SessionRow;
}

export async function listSessions(userId: string): Promise<SessionRow[]> {
  const rows = await prisma.autopilotSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map(toRow);
}

export async function getSession(userId: string, id: string): Promise<SessionRow | null> {
  const row = await prisma.autopilotSession.findFirst({ where: { id, userId } });
  return row ? toRow(row) : null;
}

export interface CreateSessionInput {
  userId: string;
  name: string;
  startingBalance: number;
  targetBalance: number;
  horizonDays: number;
  riskProfile: RiskProfile;
  symbols: string[];
  /** Cap on simultaneously live sessions; defaults to MAX_SESSIONS_PER_USER. */
  maxSessions?: number;
}

export async function createSession(input: CreateSessionInput): Promise<SessionRow> {
  const limit = input.maxSessions ?? MAX_SESSIONS_PER_USER;
  const existing = await prisma.autopilotSession.findMany({ where: { userId: input.userId }, take: 50 });
  const active = existing.filter((r: { status: string }) => r.status === "ACTIVE" || r.status === "PAUSED").length;
  if (active >= limit) {
    throw new SessionLimitError(
      limit === 1
        ? "The demo runs one paper session. Stop it to start another, or create a free account for more."
        : `You can run up to ${limit} sessions at once. Stop one to start another.`,
    );
  }

  const config: AutopilotConfig = {
    startingBalance: input.startingBalance,
    targetBalance: input.targetBalance,
    horizonDays: input.horizonDays,
    riskProfile: input.riskProfile,
    symbols: input.symbols,
    // Trading begins with the next candle to open — nothing before "now" is replayed.
    startedAt: Date.now(),
  };
  const created = await prisma.autopilotSession.create({
    data: {
      userId: input.userId,
      name: input.name,
      status: "ACTIVE",
      startingBalance: input.startingBalance,
      targetBalance: input.targetBalance,
      config: config as never,
      state: createInitialState(config) as never,
    },
  });
  return toRow(created);
}

export type SessionAction = "pause" | "resume" | "stop";

export async function applyAction(row: SessionRow, action: SessionAction): Promise<SessionRow> {
  const now = Date.now();
  const state =
    action === "stop" ? stopSession(row.state, now) : setPaused(row.state, action === "pause", now);
  const saved = await prisma.autopilotSession.update({
    where: { id: row.id },
    data: { state: state as never, status: state.status },
  });
  return toRow(saved);
}

/** Tick every live session — used by the scheduled job. Failures are isolated per session. */
export async function tickAllActive(max = 500): Promise<{ ticked: number; failed: number }> {
  const rows = (await prisma.autopilotSession.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    take: max,
  })) as unknown[];
  let ticked = 0;
  let failed = 0;
  for (const raw of rows) {
    try {
      await tickSession(toRow(raw as Record<string, unknown>));
      ticked++;
    } catch {
      failed++;
    }
  }
  return { ticked, failed };
}

