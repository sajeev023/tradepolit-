/**
 * src/lib/market-data-service.ts
 *
 * Centralized MarketDataService for TradCopilot.
 * Acts as the single source of truth for both live price fetches
 * and indicator candle calculations across all backend components
 * (API endpoints, AI analysis routes, cron jobs, alerts, risk calculator).
 *
 * Enforces Binance Spot as the exchange of truth.
 */

import { getLivePrice, getOHLCV, normalizeSymbol } from "./market";
import type { PriceData, OHLCVCandle } from "./types";

export const MarketDataService = {
  /**
   * Normalizes symbol and converts it to the Binance Spot equivalent.
   * E.g. BTC/USD -> BTCUSDT, EUR/USD -> EURUSDT
   */
  getBinanceSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    return normalized.replace("/USD", "USDT");
  },

  /**
   * Normalizes the user input symbol.
   */
  normalizeSymbol(symbol: string): string {
    return normalizeSymbol(symbol);
  },

  /**
   * Retrieves the live price for a given symbol from the centralized source.
   * Logs timestamps on every update to monitor latency.
   */
  async getLivePrice(symbol: string): Promise<PriceData> {
    const timestamp = new Date().toISOString();
    const result = await getLivePrice(symbol);
    console.log(`[MARKET DATA SERVICE] [${timestamp}] Resolved price for ${symbol} (${result.symbol}): $${result.price}`);
    return result;
  },

  /**
   * Fetches the OHLCV candles for technical indicator calculation.
   */
  async getOHLCV(symbol: string, timeframe = "1h", limit = 100): Promise<OHLCVCandle[]> {
    const timestamp = new Date().toISOString();
    const result = await getOHLCV(symbol, timeframe, limit);
    console.log(`[MARKET DATA SERVICE] [${timestamp}] Fetched ${result.length} candles for ${symbol} [${timeframe}]`);
    return result;
  },
};
