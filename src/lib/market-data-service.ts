/**
 * src/lib/market-data-service.ts
 *
 * Centralized MarketDataService for TradCopilot. Thin façade over the
 * market-data layer (src/lib/market.ts) used by API endpoints, AI analysis
 * routes, cron jobs, alerts, and the risk calculator so they share one
 * normalization + caching path. The supported-instrument universe and the
 * per-symbol provider chain live in src/lib/supported-symbols.ts.
 */

import { getLivePrice, getOHLCV, normalizeSymbol } from "./market";
import { binanceSymbolFor } from "./supported-symbols";
import type { PriceData, OHLCVCandle } from "./types";

export const MarketDataService = {
  /**
   * Resolves a (possibly shorthand) symbol to its Binance Spot equivalent,
   * e.g. BTC/USD -> BTCUSDT, EUR/USD -> EURUSDT. Uses the registry override
   * when present.
   */
  getBinanceSymbol(symbol: string): string {
    return binanceSymbolFor(this.normalizeSymbol(symbol));
  },

  /**
   * Normalizes user input to the canonical registry symbol.
   */
  normalizeSymbol(symbol: string): string {
    return normalizeSymbol(symbol);
  },

  priceCache: new Map<string, { price: PriceData; timestamp: number }>(),
  /**
   * In-flight price fetches keyed by canonical symbol. Concurrent callers
   * share the SAME Promise so two simultaneous `getLivePrice` calls don't
   * both hit the upstream and race to write the cache — the slower fetch
   * would otherwise overwrite the fresher result with staler data.
   */
  inflightPrices: new Map<string, Promise<PriceData>>(),

  /**
   * Retrieves the live price for a given symbol from the centralized source.
   * Caches results in memory for 2000ms to deduplicate concurrent requests.
   */
  async getLivePrice(symbol: string): Promise<PriceData> {
    const canonical = this.normalizeSymbol(symbol);
    const cached = this.priceCache.get(canonical);
    const now = Date.now();
    if (cached && now - cached.timestamp < 2000) {
      return cached.price;
    }

    // Share the in-flight fetch across concurrent callers.
    const existing = this.inflightPrices.get(canonical);
    if (existing) return existing;

    const fetchPromise = getLivePrice(symbol)
      .then((result: PriceData) => {
        // Capture the timestamp AFTER the await so the cache reflects when
        // the data arrived, not when the request was issued — a slow fetch
        // would otherwise get a stale timestamp and shorten the cache TTL.
        this.priceCache.set(canonical, { price: result, timestamp: Date.now() });
        this.inflightPrices.delete(canonical);
        console.log(
          `[MARKET DATA SERVICE] Resolved price for ${symbol} (${result.symbol}): $${result.price}`
        );
        return result;
      })
      .catch((err: unknown) => {
        this.inflightPrices.delete(canonical);
        throw err;
      });
    this.inflightPrices.set(canonical, fetchPromise);
    return fetchPromise;
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