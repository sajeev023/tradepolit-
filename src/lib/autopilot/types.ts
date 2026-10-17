/**
 * Autopilot — shared types.
 *
 * Autopilot is a PAPER-trading engine: a simulated spot cash account that
 * trades real market candles under hard risk limits. No broker, no real money.
 */

export type RiskProfile = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

export type SessionStatus = "ACTIVE" | "PAUSED" | "GOAL_REACHED" | "HALTED" | "STOPPED";

export interface AutopilotConfig {
  startingBalance: number;
  targetBalance: number;
  horizonDays: number;
  riskProfile: RiskProfile;
  symbols: string[];
  /** Epoch ms. Candles opening at/after this are tradable; earlier ones only warm up indicators. */
  startedAt: number;
}

export interface RiskParams {
  /** % of equity risked between entry and stop on each trade. */
  riskPerTradePct: number;
  /** New entries are blocked for the rest of the UTC day once equity falls this far below the day's open. */
  maxDailyLossPct: number;
  /** Kill switch: all positions closed and the session halted at this drawdown from peak equity. */
  maxDrawdownPct: number;
  maxOpenPositions: number;
  /** Max notional per position as % of equity (no leverage). */
  maxPositionPct: number;
  stopAtrMultiple: number;
  rewardRisk: number;
}

export interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  qty: number;
  stop: number;
  target: number;
  openedAt: number;
  entryFee: number;
  /** Cash risked if the stop is hit (excluding fees). */
  initialRisk: number;
  reason: string;
}

export interface PendingEntry {
  symbol: string;
  signalAt: number;
  atr: number;
  reasons: string[];
  review: string;
}

export type ExitReason = "STOP" | "TARGET" | "KILL_SWITCH" | "GOAL" | "MANUAL";

export interface ClosedTrade {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  openedAt: number;
  closedAt: number;
  fees: number;
  pnl: number;
  rMultiple: number;
  exitReason: ExitReason;
  reason: string;
}

export type EventKind =
  | "ENTRY_SIGNAL"
  | "ENTRY_FILLED"
  | "ENTRY_VETOED"
  | "ENTRY_CANCELLED"
  | "EXIT"
  | "GUARDRAIL"
  | "STATUS";

export interface AutopilotEvent {
  ts: number;
  kind: EventKind;
  symbol?: string;
  message: string;
}

export interface EquityPoint {
  t: number;
  e: number;
}

export interface AutopilotState {
  cash: number;
  positions: Position[];
  pending: PendingEntry[];
  closed: ClosedTrade[];
  /** Last processed close per symbol, for mark-to-market. */
  marks: Record<string, number>;
  /** Open-time of the last candle processed per symbol. */
  lastProcessed: Record<string, number>;
  peakEquity: number;
  dayKey: string;
  dayStartEquity: number;
  entriesBlockedForDay: boolean;
  status: SessionStatus;
  haltedReason?: string;
  events: AutopilotEvent[];
  equityCurve: EquityPoint[];
}

export interface EntryReview {
  approve: boolean;
  note: string;
}

export interface ReviewRequest {
  symbol: string;
  /** Epoch ms when the signal candle closed — lets a reviewer skip stale, replayed signals. */
  closedAt: number;
  price: number;
  atr: number;
  reasons: string[];
}

export type EntryReviewer = (req: ReviewRequest) => Promise<EntryReview>;

export interface SessionSummary {
  equity: number;
  returnPct: number;
  /** 0 at the starting balance, 100 at the target. Can be negative. */
  progressToGoalPct: number;
  trades: number;
  wins: number;
  winRatePct: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number;
  totalFees: number;
  openPositions: number;
}
