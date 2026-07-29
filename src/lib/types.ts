// Consistent API response envelope
export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "PREVIEW_LIMIT_REACHED"
  | "DEMO_SESSION_EXPIRED"
  | "FEATURE_LOCKED"
  | "DB_UNAVAILABLE"
  | "AUTH_FAILED"
  | "MARKET_DATA_STALE"
  | "UPSTREAM_PARTIAL"
  | "TELEMETRY_UNAVAILABLE"
  | "UNSUPPORTED_SYMBOL"
  | "STRIPE_ERROR";

// Mirror Prisma enums as string unions for client-side use
export type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
export type Direction = "LONG" | "SHORT";
export type TradeStatus = "OPEN" | "CLOSED";
export type EmotionTag = "CONFIDENT" | "FEARFUL" | "GREEDY" | "REVENGE" | "FOMO" | "DISCIPLINED" | "NEUTRAL";
export type BacktestStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
export type AlertType = "PRICE" | "RSI" | "MACD" | "EMA_CROSS" | "SUPPORT_BREAK" | "RESISTANCE_BREAK" | "TREND_CHANGE";
export type Role = "USER" | "ADMIN";

/** Persisted in the `Alert.condition` JSON column; validated by the alerts route Zod schema. */
export interface AlertCondition {
  operator: "gt" | "lt" | "crosses_above" | "crosses_below";
  value: number;
}

/** An Alert as returned by `GET /api/v1/alerts`. `condition` is the typed JSON column. */
export interface Alert {
  id: string;
  userId: string;
  instrument: string;
  type: AlertType;
  condition: AlertCondition;
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

/** A Notification as returned by `GET /api/v1/notifications`. */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * A Trade as returned by the REST API (`GET/POST /api/v1/trades`). Prisma
 * `Decimal` columns serialize to JSON as strings, so the numeric price/size
 * fields are typed `string` here — callers that need arithmetic `Number()` them
 * at the use site (the journal page does exactly this). Centralizing the shape
 * removes the per-page `any` casts that let malformed rows flow into the UI
 * unchecked, and keeps the API surface in one place (single source of truth).
 */
export interface Trade {
  id: string;
  userId: string;
  instrument: string;
  assetClass: AssetClass;
  direction: Direction;
  entryPrice: string;
  exitPrice: string | null;
  size: string;
  leverage: string;
  stopLoss: string | null;
  takeProfit: string | null;
  pnl: string | null;
  rMultiple: string | null;
  status: TradeStatus;
  openedAt: string;
  closedAt: string | null;
  strategyId: string | null;
  strategy?: { name: string } | null;
  emotionTag: EmotionTag | null;
  mistakeTags: string[];
  lessonsLearned: string | null;
  notes: string | null;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
}

// Backtest result payload (stored as Prisma `Json` in `Backtest.resultsJson`).
// The shape is discriminated by the sibling `status` column so COMPLETE and
// FAILED can never be confused: a COMPLETE row always carries trades + an
// equity curve + metrics; a FAILED row carries only an error message. The
// prior code typed this as `any`, letting a `results.trades` access on a
// FAILED row silently render `undefined` as an empty chart.
export interface BacktestTrade {
  direction: Direction;
  entryIndex: number;
  exitIndex: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  startBalance: number;
  finalEquity: number;
}

export interface BacktestEquityPoint {
  date: string;
  equity: number;
}

export interface BacktestCompleteResults {
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
  metrics: BacktestMetrics;
}

export interface BacktestFailedResults {
  error: string;
}

// PENDING/RUNNING rows store a minimal placeholder until the job finishes.
export interface BacktestPendingResults {
  metrics: { startBalance: number };
}

export type BacktestResults =
  | BacktestCompleteResults
  | BacktestFailedResults
  | BacktestPendingResults;

// Navigation items
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

// Market data types
//
// `source` is a REQUIRED discriminant, not an optional flag. Previously
// `source?: "LIVE" | "SIMULATED"` allowed `source: undefined`, which a trading
// UI would render as "live" — the most dangerous state (fabricated data shown
// as real). The discriminated union makes that impossible: the compiler
// enforces `warning` on every SIMULATED value and forbids it on LIVE.
interface PriceDataBase {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: string;
}

export type PriceData =
  | (PriceDataBase & { source: "LIVE" })
  | (PriceDataBase & { source: "SIMULATED"; warning: string });

interface OHLCVCandleBase {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OHLCVCandle =
  | (OHLCVCandleBase & { source: "LIVE" })
  | (OHLCVCandleBase & { source: "SIMULATED"; warning: string });

// Numeric 24h stats returned by provider price fetchers. This is the subset of
// PriceData that providers can partially populate; it is deliberately NOT
// `Partial<PriceData>` because the PriceData union's `source` discriminant must
// never be optional.
export interface PriceStats {
  change24h?: number;
  changePercent24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

// Performance metrics
export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageRR: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  bestAsset: string | null;
  worstAsset: string | null;
  longestWinStreak: number;
  longestLoseStreak: number;
  averageTradeDuration: number;
  totalPnL: number;
}

// Fear & Greed
export interface FearGreedData {
  value: number;
  valueClassification: string;
  timestamp: string;
}

// News item
export interface NewsItem {
  id: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  sentiment: number;
  importance: number;
  affectedAssets: string[];
  publishedAt: string;
}
