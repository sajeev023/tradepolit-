/**
 * src/lib/market.ts
 *
 * Market-data access layer for TradCopilot. The supported instrument universe
 * — Crypto, Forex, Commodities, Indices, and equities across US / India /
 * Japan / UAE / UK / Europe — lives in `./supported-symbols.ts`. This module
 * consumes that registry as the single source of truth for:
 *
 *   - Symbol normalization (legacy shorthand → canonical registry symbol).
 *   - The ordered provider chain per symbol (Twelve Data / Binance / Coinbase).
 *   - Twelve Data `exchange` routing for non-US / ambiguous listings.
 *
 * Fail-fast contract: requesting a symbol that is NOT in the registry throws
 * `UnsupportedSymbolError` (→ 422 from routes). A *supported* symbol whose
 * providers are all unavailable legitimately falls back to clearly-labelled
 * SIMULATED data — that is intentional and surfaced to the user via a banner.
 * Never fabricate prices for an unknown instrument.
 */
import { getCachedData, setCachedData } from "./cache";
import { redactKey } from "./startup";
import type { PriceData, OHLCVCandle, PriceStats } from "./types";
import {
  SUPPORTED_SYMBOL_MAP,
  getSupportedSymbol,
  isSupportedSymbol,
  twelvedataSymbolFor,
  twelvedataExchangeFor,
  binanceSymbolFor,
  coinbaseSymbolFor,
  providersFor,
  BASELINE_PRICES,
  VOLATILITIES,
} from "./supported-symbols";
import { UnsupportedSymbolError } from "./typed-errors";
import {
  tdIntervalFor,
  binanceIntervalFor,
  coinbaseCandleSpecFor,
  timeframeDurationMs,
  ohlcvCacheTtlFor,
} from "./timeframes";

// ─── Twelve Data key validation ──────────────────────────────────────────────
function isTwelvedataKeyValid(): boolean {
  const k = process.env.TWELVEDATA_API_KEY;
  return !!k && k.trim() !== "" && k.trim() !== "mock-key" && k.trim() !== "placeholder-key";
}

// ─── Twelve Data circuit breaker ─────────────────────────────────────────────
// Repeated 401/403/429/network failures open the circuit for 30s so a Twelve
// Data outage doesn't cascade into per-request timeouts across the whole app.
// While open, the Twelve Data provider is skipped and the chain falls through
// to the next provider (or labelled SIMULATED) — same behavior, no wasted
// latency on a provider we know is down.
const TD_CIRCUIT = { openUntil: 0, consecutiveFailures: 0 };
function isTdCircuitOpen(): boolean {
  return Date.now() < TD_CIRCUIT.openUntil;
}
function tdRecordFailure(): void {
  TD_CIRCUIT.consecutiveFailures += 1;
  if (TD_CIRCUIT.consecutiveFailures >= 3 && TD_CIRCUIT.openUntil <= Date.now()) {
    TD_CIRCUIT.openUntil = Date.now() + 30_000;
    console.error("[Market] TwelveData circuit OPEN for 30s after repeated failures");
  }
}
function tdRecordSuccess(): void {
  TD_CIRCUIT.consecutiveFailures = 0;
  TD_CIRCUIT.openUntil = 0;
}

export function normalizeSymbol(symbol: string): string {
  if (!symbol) return symbol;
  const upper = symbol.toUpperCase();
  // Canonical registry hit (BTC/USD, AAPL, SHEL.L, S&P500, 7203, …). Returned
  // as-is so display/storage matches the registry exactly.
  if (SUPPORTED_SYMBOL_MAP[upper]) return upper;
  // Legacy crypto shorthand normalization (BTCUSDT / BTC-USD / BTC → BTC/USD).
  // We intentionally do NOT blanket-replace "-"→"/" or "USDT"→"/USD" — that
  // mangles tickers like BRK-B and any USDT-containing symbol.
  const cryptoShorthand: Record<string, string> = {
    BTC: "BTC/USD", BTCUSDT: "BTC/USD", "BTC-USD": "BTC/USD",
    ETH: "ETH/USD", ETHUSDT: "ETH/USD", "ETH-USD": "ETH/USD",
    SOL: "SOL/USD", SOLUSDT: "SOL/USD", "SOL-USD": "SOL/USD",
  };
  if (cryptoShorthand[upper]) return cryptoShorthand[upper];
  // Unknown symbol — return uppercased input unchanged. The caller (getLivePrice
  // / getOHLCV) fails fast with UnsupportedSymbolError; we never silently mangle
  // it into something we'd then fabricate prices for.
  return upper;
}

function downsampleCandles(candles: OHLCVCandle[], factor: number): OHLCVCandle[] {
  const result: OHLCVCandle[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const base = {
      timestamp: first.timestamp,
      open: first.open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    };
    // Preserve the source discriminant so a downsampled SIMULATED candle keeps
    // its warning (and a LIVE candle stays untagged) — the union has no default.
    if (first.source === "SIMULATED") {
      result.push({ ...base, source: "SIMULATED" as const, warning: first.warning });
    } else {
      result.push({ ...base, source: "LIVE" as const });
    }
  }
  return result;
}

// ─── Provider: Twelve Data ───────────────────────────────────────────────────
function tdUrl(path: string, normSymbol: string): string {
  const tdSymbol = twelvedataSymbolFor(normSymbol);
  const exchange = twelvedataExchangeFor(normSymbol);
  const exchangeParam = exchange ? `&exchange=${encodeURIComponent(exchange)}` : "";
  return `https://api.twelvedata.com/${path}?symbol=${encodeURIComponent(tdSymbol)}${exchangeParam}&apikey=${process.env.TWELVEDATA_API_KEY}`;
}

async function fetchTdPrice(normSymbol: string): Promise<{ price: number; stats: PriceStats | null } | null> {
  if (!isTwelvedataKeyValid()) {
    console.warn(`[Market] TwelveData ✗ key missing for ${normSymbol} — skipping`);
    return null;
  }
  if (isTdCircuitOpen()) {
    console.warn(`[Market] TwelveData ✗ circuit open for ${normSymbol} — skipping`);
    return null;
  }
  let price: number | null = null;
  try {
    const res = await fetch(tdUrl("price", normSymbol), { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (res.ok) {
      const tdData = await res.json();
      if (tdData.price && !isNaN(parseFloat(tdData.price))) {
        price = parseFloat(tdData.price);
        tdRecordSuccess();
        console.log(`[Market] TwelveData ← ${normSymbol} = $${price}`);
      } else if (tdData.status === "error") {
        console.warn(`[Market] TwelveData ✗ ${normSymbol}: ${tdData.message}`);
      }
    } else {
      console.warn(`[Market] TwelveData ✗ ${normSymbol}: HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        tdRecordFailure();
        console.error(
          `[Market-Key-Loaded] env=TWELVEDATA_API_KEY provider=twelvedata` +
          ` redacted=${redactKey(process.env.TWELVEDATA_API_KEY)}` +
          ` status=${res.status} symbol=${normSymbol}` +
          ` | Verify: (1) Vercel env, (2) TwelveData dashboard, (3) request shape.`
        );
      }
    }
  } catch (tdErr) {
    console.warn(`[Market] TwelveData ✗ ${normSymbol}: ${(tdErr as Error).message}`);
    tdRecordFailure();
  }
  if (!price) return null;

  // 24h stats from a 2-point 1min time series (open ≈ 24h ago is approximate;
  // matches the legacy behavior so callers don't regress).
  let stats: PriceStats | null = null;
  try {
    const res = await fetch(tdUrl("time_series", normSymbol) + "&interval=1min&outputsize=2", {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.values && data.values.length > 0) {
        const latest = data.values[0];
        const open = parseFloat(latest.open);
        stats = {
          change24h: price - open,
          changePercent24h: open > 0 ? ((price - open) / open) * 100 : 0,
          high24h: parseFloat(latest.high),
          low24h: parseFloat(latest.low),
          volume24h: parseFloat(latest.volume || "0"),
        };
        await setCachedData(`price-stats:${normSymbol}`, stats, 15);
      }
    }
  } catch (_) {}
  return { price, stats };
}

async function fetchTdOHLCV(normSymbol: string, timeframe: string, limit: number): Promise<OHLCVCandle[]> {
  if (!isTwelvedataKeyValid()) {
    console.warn(`[Market] TwelveData ✗ key missing for OHLCV ${normSymbol} — skipping`);
    return [];
  }
  if (isTdCircuitOpen()) {
    console.warn(`[Market] TwelveData ✗ circuit open for OHLCV ${normSymbol} — skipping`);
    return [];
  }
  const tdInterval = tdIntervalFor(timeframe);
  try {
    const res = await fetch(tdUrl("time_series", normSymbol) + `&interval=${tdInterval}&outputsize=${limit}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "error") {
        console.warn(`[Market] TwelveData ✗ OHLCV ${normSymbol}: ${data.message}`);
      } else if (data.values && data.values.length > 0) {
        tdRecordSuccess();
        const candles = data.values
          .map((v: any) => ({
            timestamp: new Date(v.datetime).getTime(),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: parseFloat(v.volume || "0"),
            source: "LIVE" as const,
          }))
          .reverse();
        console.log(`[Market] TwelveData ← OHLCV ${normSymbol} (${timeframe}) = ${candles.length} candles`);
        return candles;
      }
    } else {
      console.warn(`[Market] TwelveData ✗ OHLCV ${normSymbol}: HTTP ${res.status}`);
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        tdRecordFailure();
        console.error(
          `[Market-Key-Loaded] env=TWELVEDATA_API_KEY provider=twelvedata` +
          ` redacted=${redactKey(process.env.TWELVEDATA_API_KEY)}` +
          ` status=${res.status} symbol=${normSymbol} interval=${tdInterval}` +
          ` | Verify: (1) Vercel env, (2) TwelveData dashboard, (3) request shape.`
        );
      }
    }
  } catch (tdErr) {
    console.warn(`[Market] TwelveData ✗ OHLCV ${normSymbol}: ${(tdErr as Error).message}`);
    tdRecordFailure();
  }
  return [];
}

// ─── Provider: Binance ───────────────────────────────────────────────────────
async function fetchBinancePrice(normSymbol: string): Promise<{ price: number; stats: PriceStats | null } | null> {
  const binanceSymbol = binanceSymbolFor(normSymbol);
  let price: number | null = null;
  let stats: PriceStats | null = null;
  const statsCacheKey = `price-stats:${normSymbol}`;
  const cachedStats = await getCachedData<PriceStats>(statsCacheKey);

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.price && !isNaN(parseFloat(data.price))) {
        price = parseFloat(data.price);
        console.log(`[Market] Binance ← ${normSymbol} (${binanceSymbol}) = $${price}`);
      }
    }
  } catch (err) {
    console.warn(`[Market] Binance ✗ ${normSymbol}: ${(err as Error).message}`);
  }
  if (!price) return null;

  if (cachedStats) {
    stats = cachedStats;
  } else {
    const endpoints = [
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
      `https://api1.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
      `https://api3.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
    ];
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000), cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.lastPrice && !isNaN(parseFloat(data.lastPrice))) {
            stats = {
              change24h: parseFloat(data.priceChange),
              changePercent24h: parseFloat(data.priceChangePercent),
              high24h: parseFloat(data.highPrice),
              low24h: parseFloat(data.lowPrice),
              volume24h: parseFloat(data.volume),
            };
            await setCachedData(statsCacheKey, stats, 15);
            break;
          }
        }
      } catch (_) {}
    }
  }
  return { price, stats };
}

async function fetchBinanceOHLCV(normSymbol: string, timeframe: string, limit: number): Promise<OHLCVCandle[]> {
  const binanceSymbol = binanceSymbolFor(normSymbol);
  const binanceInterval = binanceIntervalFor(timeframe);
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const candles = data.map((c: any) => ({
            timestamp: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
            source: "LIVE" as const,
          }));
          console.log(`[Market] Binance ← OHLCV ${normSymbol} (${binanceSymbol}, ${timeframe}) = ${candles.length} candles`);
          return candles;
        }
      }
    } catch (subErr) {
      console.warn(`[Market] Binance ✗ OHLCV ${normSymbol} on ${endpoint}: ${(subErr as Error).message}`);
    }
  }
  return [];
}

// ─── Provider: Coinbase ──────────────────────────────────────────────────────
async function fetchCoinbasePrice(normSymbol: string): Promise<{ price: number; stats: PriceStats | null } | null> {
  const coinbaseSymbol = coinbaseSymbolFor(normSymbol);
  let price: number | null = null;
  let stats: PriceStats | null = null;
  const statsCacheKey = `price-stats:${normSymbol}`;
  const cachedStats = await getCachedData<PriceStats>(statsCacheKey);

  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${coinbaseSymbol}/ticker`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
      headers: { "User-Agent": "TradCopilot/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.price && !isNaN(parseFloat(data.price))) {
        price = parseFloat(data.price);
        console.log(`[Market] Coinbase ← ${normSymbol} (${coinbaseSymbol}) = $${price}`);
      }
    }
  } catch (_) {}
  if (!price) return null;

  if (cachedStats) {
    stats = cachedStats;
  } else {
    try {
      const res = await fetch(`https://api.exchange.coinbase.com/products/${coinbaseSymbol}/stats`, {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
        headers: { "User-Agent": "TradCopilot/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        const open = parseFloat(data.open);
        const change = price - open;
        const changePercent = open > 0 ? (change / open) * 100 : 0;
        stats = {
          change24h: change,
          changePercent24h: changePercent,
          high24h: parseFloat(data.high),
          low24h: parseFloat(data.low),
          volume24h: parseFloat(data.volume),
        };
        await setCachedData(statsCacheKey, stats, 15);
      }
    } catch (_) {}
  }
  return { price, stats };
}

async function fetchCoinbaseOHLCV(normSymbol: string, timeframe: string, limit: number): Promise<OHLCVCandle[]> {
  const coinbaseSymbol = coinbaseSymbolFor(normSymbol);
  const { granularity, factor } = coinbaseCandleSpecFor(timeframe);

  try {
    const res = await fetch(
      `https://api.exchange.coinbase.com/products/${coinbaseSymbol}/candles?granularity=${granularity}`,
      { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "TradCopilot/1.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((c: any) => ({
          timestamp: c[0] * 1000,
          open: parseFloat(c[3]),
          high: parseFloat(c[2]),
          low: parseFloat(c[1]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5]),
          source: "LIVE" as const,
        })).reverse();
        const candles = (factor > 1 ? downsampleCandles(mapped, factor) : mapped).slice(0, limit);
        console.log(`[Market] Coinbase ← OHLCV ${normSymbol} (${coinbaseSymbol}, ${timeframe}) = ${candles.length} candles`);
        return candles;
      }
    }
  } catch (cbErr) {
    console.warn(`[Market] Coinbase ✗ OHLCV ${normSymbol}: ${(cbErr as Error).message}`);
  }
  return [];
}

const PROVIDER_PRICE_FETCHERS: Record<string, (s: string) => Promise<{ price: number; stats: PriceStats | null } | null>> = {
  twelvedata: fetchTdPrice,
  binance: fetchBinancePrice,
  coinbase: fetchCoinbasePrice,
};

const PROVIDER_OHLCV_FETCHERS: Record<string, (s: string, tf: string, limit: number) => Promise<OHLCVCandle[]>> = {
  twelvedata: fetchTdOHLCV,
  binance: fetchBinanceOHLCV,
  coinbase: fetchCoinbaseOHLCV,
};

export async function getLivePrice(symbol: string): Promise<PriceData> {
  const normSymbol = normalizeSymbol(symbol);

  // Fail-fast: an unsupported symbol never receives fabricated prices.
  if (!isSupportedSymbol(normSymbol)) {
    throw new UnsupportedSymbolError(normSymbol);
  }

  const cacheKey = `price:${normSymbol}`;
  const cached = await getCachedData<PriceData>(cacheKey);
  if (cached) return cached;

  let price: number | null = null;
  let stats: PriceStats | null = null;

  try {
    // Walk the registry-ordered provider chain. The first provider that
    // returns a price wins; subsequent providers are not consulted.
    for (const provider of providersFor(normSymbol)) {
      const fetcher = PROVIDER_PRICE_FETCHERS[provider];
      if (!fetcher) continue;
      const result = await fetcher(normSymbol);
      if (result) {
        price = result.price;
        if (result.stats) stats = result.stats;
        break;
      }
    }
  } catch (err) {
    console.error(`Upstream fetch failed for ${normSymbol}, falling back to simulated:`, err);
  }

  // ── Compile final PriceData payload ──────────────────────────────────────
  let priceData: PriceData | null = null;
  if (price) {
    priceData = {
      symbol: normSymbol,
      price,
      change24h: stats?.change24h ?? 0,
      changePercent24h: stats?.changePercent24h ?? 0,
      high24h: stats?.high24h ?? price,
      low24h: stats?.low24h ?? price,
      volume24h: stats?.volume24h ?? 0,
      updatedAt: new Date().toISOString(),
      source: "LIVE",
    };
  }

  // ── Labelled simulated fallback (supported symbol, all providers down) ───
  if (!priceData) {
    const cacheKeyMock = `mock:price:${normSymbol}`;
    const lastMockPriceObj = await getCachedData<{ price: number }>(cacheKeyMock);
    const basePrice = lastMockPriceObj?.price || BASELINE_PRICES[normSymbol] || 100.0;
    const vol = VOLATILITIES[normSymbol] || 0.01;
    // Walk step: small continuous random step between -0.05% and +0.05%
    const stepPct = (Math.random() * 2 - 1) * (vol * 0.05) * 100;
    const walkedPrice = basePrice * (1 + stepPct / 100);
    const change = walkedPrice - (BASELINE_PRICES[normSymbol] || 100.0);
    const changePercent = ((walkedPrice - (BASELINE_PRICES[normSymbol] || 100.0)) / (BASELINE_PRICES[normSymbol] || 100.0)) * 100;

    console.warn(`[Market] SIMULATED ← ${normSymbol} = $${walkedPrice.toFixed(4)} (all providers failed)`);

    priceData = {
      symbol: normSymbol,
      price: walkedPrice,
      change24h: change,
      changePercent24h: changePercent,
      high24h: Math.max(walkedPrice, BASELINE_PRICES[normSymbol] || 100.0) * 1.002,
      low24h: Math.min(walkedPrice, BASELINE_PRICES[normSymbol] || 100.0) * 0.998,
      volume24h: (BASELINE_PRICES[normSymbol] || 100.0) * 1000 + Math.random() * 500,
      updatedAt: new Date().toISOString(),
      source: "SIMULATED",
      warning: `Live market data for ${normSymbol} is temporarily unavailable. Showing a simulated price — do not trade on this value.`,
    };

    // Save mock price back to cache for persistent walk (TTL: 1 hour)
    await setCachedData(cacheKeyMock, { price: walkedPrice }, 3600);
  }

  // Cache the final price data with a 1-second TTL (snappy sub-second alignment)
  await setCachedData(cacheKey, priceData, 1);
  console.log(`[MARKET PRICE UPDATE] [${new Date().toISOString()}] Symbol: ${priceData.symbol}, Price: $${priceData.price}`);
  return priceData;
}

export async function getOHLCV(
  symbol: string,
  timeframe = "1h",
  limit = 100
): Promise<OHLCVCandle[]> {
  const normSymbol = normalizeSymbol(symbol);

  // Fail-fast: unsupported symbol → never fabricate candles.
  if (!isSupportedSymbol(normSymbol)) {
    throw new UnsupportedSymbolError(normSymbol);
  }

  const cacheKey = `ohlcv:${normSymbol}:${timeframe}:${limit}`;
  const cached = await getCachedData<OHLCVCandle[]>(cacheKey);
  if (cached) return cached;

  let candles: OHLCVCandle[] = [];
  try {
    for (const provider of providersFor(normSymbol)) {
      const fetcher = PROVIDER_OHLCV_FETCHERS[provider];
      if (!fetcher) continue;
      candles = await fetcher(normSymbol, timeframe, limit);
      if (candles.length > 0) break;
    }
  } catch (err) {
    console.error(`[Market] OHLCV upstream failed for ${normSymbol}, falling back to simulated:`, err);
  }

  // ── Labelled simulated historical candles (supported symbol, providers down) ──
  const isSimulated = candles.length === 0;
  if (isSimulated) {
    const basePrice = BASELINE_PRICES[normSymbol] || 100.0;
    const vol = VOLATILITIES[normSymbol] || 0.01;
    let currentPrice = basePrice;
    const now = Date.now();
    const stepMs = timeframeDurationMs(timeframe);
    const warning = `Live OHLCV for ${normSymbol} is temporarily unavailable. Showing simulated candles — do not trade on these values.`;

    // Build the candles already tagged SIMULATED so the warning is baked in and
    // survives the cache round-trip. The prior code cached the *untagged* temp
    // candles and only added source/warning on the return path, so a cache hit
    // served simulated candles that looked live — the most dangerous state.
    const tempCandles: OHLCVCandle[] = [];
    for (let i = limit; i > 0; i--) {
      const open = currentPrice;
      const changePercent = (Math.random() * 2 - 1) * vol;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * (vol / 2));
      const low = Math.min(open, close) * (1 - Math.random() * (vol / 2));
      const volume = basePrice * 500 + Math.random() * 1000;
      tempCandles.push({ timestamp: now - i * stepMs, open, high, low, close, volume, source: "SIMULATED" as const, warning });
      currentPrice = close;
    }
    candles = tempCandles;
  }

  // Cache the resolved candles (timeframe-dependent TTL for freshness). Both
  // LIVE and SIMULATED candles are cached in their final, tagged form.
  const ttl = ohlcvCacheTtlFor(timeframe);
  await setCachedData(cacheKey, candles, ttl);

  return candles;
}

// Exported for callers (e.g. MarketDataService, tests) that need the registry
// metadata without re-importing supported-symbols directly.
export { getSupportedSymbol };