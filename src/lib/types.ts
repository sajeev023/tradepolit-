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
  | "UNSUPPORTED_SYMBOL";

// Mirror Prisma enums as string unions for client-side use
export type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
export type Direction = "LONG" | "SHORT";
export type TradeStatus = "OPEN" | "CLOSED";
export type EmotionTag = "CONFIDENT" | "FEARFUL" | "GREEDY" | "REVENGE" | "FOMO" | "DISCIPLINED" | "NEUTRAL";
export type BacktestStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
export type AlertType = "PRICE" | "RSI" | "MACD" | "EMA_CROSS" | "SUPPORT_BREAK" | "RESISTANCE_BREAK" | "TREND_CHANGE";
export type Role = "USER" | "ADMIN";

// Navigation items
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

// Market data types
export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: string;
  source?: "LIVE" | "SIMULATED";
  // Surfaced when source === "SIMULATED". The frontend renders this as a
  // banner so users never unknowingly trade on fabricated data.
  warning?: string;
}

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: "LIVE" | "SIMULATED";
  warning?: string;
}

// Risk calculator types
export interface RiskCalcInput {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  instrumentType: "CRYPTO" | "FOREX";
  pipValue?: number;
}

export interface RiskCalcResult {
  positionSize: number;
  dollarRisk: number;
  lotSize?: number;
  lotType?: "standard" | "mini" | "micro";
  riskRewardRatio: number;
  potentialProfit: number;
  maxLoss: number;
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
