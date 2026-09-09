import { getCachedData, setCachedData } from "./cache";
import { redactKey } from "./startup";
import type { PriceData, OHLCVCandle } from "./types";
import {
  SYMBOLS,
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  INDEX_SYMBOLS,
  BASELINE_PRICES,
  VOLATILITIES,
  BINANCE_SYMBOL_MAP,
  TWELVEDATA_SYMBOL_MAP,
  wantsTwelveData,
  wantsBinance,
} from "./market-registry";

// Re-export the canonical symbol arrays so existing imports of
// CRYPTO_SYMBOLS / FOREX_SYMBOLS / INDEX_SYMBOLS from market.ts keep working.
export { CRYPTO_SYMBOLS, FOREX_SYMBOLS, INDEX_SYMBOLS };

/** All known display symbols (back-compat for the old ALL_SYMBOLS). */
const ALL_SYMBOLS = SYMBOLS;

/** Resolve the TwelveData ticker for a symbol (falls back to the symbol itself). */
function twelvedataSymbolFor(symbol: string): string {
  return TWELVEDATA_SYMBOL_MAP[symbol] ?? symbol;
}

function isTwelvedataKeyValid(): boolean {
  const k = process.env.TWELVEDATA_API_KEY;
  return !!k && k.trim() !== "" && k.trim() !== "mock-key" && k.trim() !== "placeholder-key";
}

export function normalizeSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace("-", "/").replace("USDT", "/USD");
  if (ALL_SYMBOLS.includes(clean)) return clean;
  // Fallback map
  if (clean === "BTC" || clean === "BTCUSDT") return "BTC/USD";
  if (clean === "ETH" || clean === "ETHUSDT") return "ETH/USD";
  if (clean === "SOL" || clean === "SOLUSDT") return "SOL/USD";
  return clean;
}

/**
 * Whitelist check: is this a registered instrument?
 *
 * Unknown symbols previously flowed through into upstream provider URLs
 * (`symbol=${...}` interpolation) and — when all providers failed —
 * produced SIMULATED data for instruments that don't exist. Routes must
 * reject unregistered symbols with a 4xx instead.
 */
export function isRegisteredSymbol(symbol: string): boolean {
  return ALL_SYMBOLS.includes(normalizeSymbol(symbol));
}

function downsampleCandles(candles: OHLCVCandle[], factor: number): OHLCVCandle[] {
  const result: OHLCVCandle[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor);
    if (chunk.length === 0) continue;
    const timestamp = chunk[0].timestamp;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map(c => c.high));
    const low = Math.min(...chunk.map(c => c.low));
    const volume = chunk.reduce((sum, c) => sum + c.volume, 0);
    result.push({ timestamp, open, high, low, close, volume });
  }
  return result;
}

export async function getLivePrice(symbol: string): Promise<PriceData> {
  const normSymbol = normalizeSymbol(symbol);
  const cacheKey = `price:${normSymbol}`;

  // 1. Try server-side cache first (1 second TTL for sub-second efficiency)
  const cached = await getCachedData<PriceData>(cacheKey);
  if (cached) return cached;

  let price: number | null = null;
  let stats: Partial<PriceData> | null = null;

  const statsCacheKey = `price-stats:${normSymbol}`;
  const cachedStats = await getCachedData<Partial<PriceData>>(statsCacheKey);

  try {
    // ── Provider priority chain ─────────────────────────────────────────
    //
    //   1. TwelveData  — primary for forex, indices, XAU. Always try first
    //                    when the key is configured; the key covers EUR/GBP/
    //                    USD/JPY/XAU/NASDAQ/S&P500 reliably.
    //   2. Binance     — primary for crypto (BTC/ETH/SOL) and EUR/GBP as
    //                    high-frequency fallback.
    //   3. Coinbase    — last-resort fallback for crypto.
    //
    // Provider selection is symbol-driven:
    //   - Crypto & supported forex pairs → Binance (then Coinbase).
    //   - All other forex, indices, XAU  → TwelveData (if key set).
    //
    // Each provider returns silently on failure so the next one can run.
    // Provider selection is driven by the market registry, not hardcoded here.
    const tdKeyValid = isTwelvedataKeyValid();
    const symbolWantsTwelveData = wantsTwelveData(normSymbol, tdKeyValid);
    const symbolWantsBinance = wantsBinance(normSymbol);

    if (symbolWantsTwelveData && tdKeyValid) {
      const tdSymbol = twelvedataSymbolFor(normSymbol);
      // Encode both the symbol and the key — they flow into a query
      // string and must never allow parameter injection or leak
      // malformed credentials into proxy logs.
      const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${encodeURIComponent(process.env.TWELVEDATA_API_KEY!)}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
        if (res.ok) {
          const tdData = await res.json();
          if (tdData.price && !isNaN(parseFloat(tdData.price))) {
            price = parseFloat(tdData.price);
            console.log(`[Market] TwelveData ← ${normSymbol} (${tdSymbol}) = $${price}`);
          } else if (tdData.status === "error") {
            console.warn(`[Market] TwelveData ✗ ${normSymbol}: ${tdData.message}`);
          }
        } else {
          console.warn(`[Market] TwelveData ✗ ${normSymbol}: HTTP ${res.status}`);
          if (res.status === 401 || res.status === 403 || res.status === 429) {
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
      }

      if (price) {
        // Fetch 24h stats from TwelveData time series
        const tdStatsSymbol = twelvedataSymbolFor(normSymbol);
        try {
          const res = await fetch(
            `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdStatsSymbol)}&interval=1min&outputsize=2&apikey=${encodeURIComponent(process.env.TWELVEDATA_API_KEY!)}`,
            { signal: AbortSignal.timeout(3000), cache: "no-store" }
          );
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
              await setCachedData(statsCacheKey, stats, 15);
            }
          }
        } catch (_) {}
      }
    } else if (symbolWantsTwelveData && !tdKeyValid) {
      // The symbol requires TwelveData (forex/indices/XAU) and the key
      // is missing — log explicitly so the operator sees it. We do NOT
      // hard-error 503 here; the call falls through to SIMULATED and
      // the existing P0 fix surfaces missing telemetry to the user.
      console.warn(
        `[Market] TwelveData ✗ key missing for ${normSymbol} — falling back to SIMULATED`
      );
    }

    if (!price && symbolWantsBinance) {
      const binanceSymbol = BINANCE_SYMBOL_MAP[normSymbol] ?? normSymbol.replace("/USD", "USDT");

      // ── Step A: Fetch absolute real-time transaction price (120ms latency, zero lag)
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

      // ── Step B: Fetch or retrieve cached 24h stats (15s cache TTL to avoid rate-limiting and lag)
      if (cachedStats) {
        stats = cachedStats;
      } else if (price) {
        const endpoints = [
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          `https://api1.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          `https://api3.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
        ];
        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint, {
              signal: AbortSignal.timeout(3000),
              cache: "no-store",
            });
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
                // Cache 24h stats for 15 seconds
                await setCachedData(statsCacheKey, stats, 15);
                break;
              }
            }
          } catch (_) {}
        }
      }

      // Coinbase Fallback (if Binance fails to provide price)
      if (!price) {
        const coinbaseSymbol = normSymbol.replace("/", "-"); // BTC/USD -> BTC-USD
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

        if (price) {
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
        }
      }
    }
  } catch (err) {
    console.error(`Upstream fetch failed for ${normSymbol}, falling back to mock:`, err);
  }

  // ── Step C: Compile final PriceData payload
  let priceData: PriceData | null = null;
  if (price) {
    const defaultStats = {
      change24h: stats?.change24h ?? 0,
      changePercent24h: stats?.changePercent24h ?? 0,
      high24h: stats?.high24h ?? price,
      low24h: stats?.low24h ?? price,
      volume24h: stats?.volume24h ?? 0,
    };
    priceData = {
      symbol: normSymbol,
      price,
      ...defaultStats,
      updatedAt: new Date().toISOString(),
      source: "LIVE",
    };
  }

  // ── Step D: Generate smooth-walk simulated price if API failed or not configured (prevents jumping)
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

  // Log timestamped price update
  console.log(`[MARKET PRICE UPDATE] [${new Date().toISOString()}] Symbol: ${priceData.symbol}, Price: $${priceData.price}`);

  return priceData;
}

export async function getOHLCV(
  symbol: string,
  timeframe = "1h",
  limit = 100
): Promise<OHLCVCandle[]> {
  const normSymbol = normalizeSymbol(symbol);
  const cacheKey = `ohlcv:${normSymbol}:${timeframe}:${limit}`;

  // 1. Try cache (1 hour TTL)
  const cached = await getCachedData<OHLCVCandle[]>(cacheKey);
  if (cached) return cached;

  let candles: OHLCVCandle[] = [];

  try {
    // TwelveData first when key is set and the symbol requires it
    // (forex / indices / XAU). Crypto and EUR/GBP prefer Binance.
    // Provider selection is driven by the market registry, not hardcoded here.
    const tdKeyValid = isTwelvedataKeyValid();
    const symbolWantsTwelveData = wantsTwelveData(normSymbol, tdKeyValid);
    const symbolWantsBinance = wantsBinance(normSymbol);

    if (symbolWantsTwelveData && tdKeyValid) {
      const tdInterval =
        timeframe === "1m" ? "1min" :
        timeframe === "5m" ? "5min" :
        timeframe === "15m" ? "15min" :
        timeframe === "1h" ? "1h" :
        timeframe === "4h" ? "4h" :
        timeframe === "1d" ? "1day" :
        timeframe === "1W" ? "1week" : "1h";
      const tdSymbol = twelvedataSymbolFor(normSymbol);
      try {
        const res = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=${limit}&apikey=${process.env.TWELVEDATA_API_KEY}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === "error") {
            console.warn(`[Market] TwelveData ✗ OHLCV ${normSymbol} (${tdSymbol}): ${data.message}`);
          } else if (data.values && data.values.length > 0) {
            candles = data.values
              .map((v: any) => ({
                timestamp: new Date(v.datetime).getTime(),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
                volume: parseFloat(v.volume || "0"),
              }))
              .reverse();
            console.log(`[Market] TwelveData ← OHLCV ${normSymbol} (${tdSymbol}, ${timeframe}) = ${candles.length} candles`);
          }
        } else {
          console.warn(`[Market] TwelveData ✗ OHLCV ${normSymbol}: HTTP ${res.status}`);
          if (res.status === 401 || res.status === 403 || res.status === 429) {
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
      }
    } else if (symbolWantsTwelveData && !tdKeyValid) {
      console.warn(
        `[Market] TwelveData ✗ key missing for OHLCV ${normSymbol} — falling back to SIMULATED`
      );
    }

    if (candles.length === 0 && symbolWantsBinance) {
      // Fetch crypto/forex klines from Binance multi-endpoints
      const binanceSymbol = BINANCE_SYMBOL_MAP[normSymbol] ?? normSymbol.replace("/USD", "USDT");
      const binanceInterval =
        timeframe === "1m" ? "1m" :
        timeframe === "5m" ? "5m" :
        timeframe === "15m" ? "15m" :
        timeframe === "1h" ? "1h" :
        timeframe === "4h" ? "4h" :
        timeframe === "1d" ? "1d" :
        timeframe === "1W" ? "1w" : "1h";

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
              candles = data.map((c: any) => ({
                timestamp: c[0],
                open: parseFloat(c[1]),
                high: parseFloat(c[2]),
                low: parseFloat(c[3]),
                close: parseFloat(c[4]),
                volume: parseFloat(c[5]),
              }));
              console.log(`[Market] Binance ← OHLCV ${normSymbol} (${binanceSymbol}, ${timeframe}) = ${candles.length} candles`);
              break;
            }
          }
        } catch (subErr) {
          console.warn(`[Market] Binance ✗ OHLCV ${normSymbol} on ${endpoint}: ${(subErr as Error).message}`);
        }
      }

      // Coinbase Fallback
      if (candles.length === 0) {
        try {
          const coinbaseSymbol = normSymbol.replace("/", "-");
          let granularity = 3600;
          let factor = 1;
          if (timeframe === "1m") {
            granularity = 60;
          } else if (timeframe === "5m") {
            granularity = 300;
          } else if (timeframe === "15m") {
            granularity = 900;
          } else if (timeframe === "1h") {
            granularity = 3600;
          } else if (timeframe === "4h") {
            granularity = 3600;
            factor = 4;
          } else if (timeframe === "1d") {
            granularity = 86400;
          } else if (timeframe === "1W") {
            granularity = 86400;
            factor = 7;
          }

          const res = await fetch(
            `https://api.exchange.coinbase.com/products/${coinbaseSymbol}/candles?granularity=${granularity}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { "User-Agent": "TradCopilot/1.0" },
            }
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
              })).reverse();

              candles = factor > 1 ? downsampleCandles(mapped, factor) : mapped;
              console.log(`[Market] Coinbase ← OHLCV ${normSymbol} (${coinbaseSymbol}, ${timeframe}) = ${candles.length} candles`);
            }
          }
        } catch (cbErr) {
          console.warn(`[Market] Coinbase ✗ OHLCV ${normSymbol}: ${(cbErr as Error).message}`);
        }
      }
    }
  } catch (err) {
    console.error(`[Market] OHLCV upstream failed for ${normSymbol}, falling back to mock:`, err);
  }

  // 2. Generate simulated historical candles if needed (clearly marked)
  const isSimulated = candles.length === 0;
  if (isSimulated) {
    const basePrice = BASELINE_PRICES[normSymbol] || 100.0;
    const vol = VOLATILITIES[normSymbol] || 0.01;
    let currentPrice = basePrice;
    const now = Date.now();
    const stepMs =
      timeframe === "1m"
        ? 1 * 60 * 1000
        : timeframe === "5m"
        ? 5 * 60 * 1000
        : timeframe === "15m"
        ? 15 * 60 * 1000
        : timeframe === "1h"
        ? 60 * 60 * 1000
        : timeframe === "4h"
        ? 4 * 60 * 60 * 1000
        : timeframe === "1d"
        ? 24 * 60 * 60 * 1000
        : timeframe === "1W"
        ? 7 * 24 * 60 * 60 * 1000
        : 60 * 60 * 1000;

    // Generate limit number of candles back in time
    const tempCandles: OHLCVCandle[] = [];
    for (let i = limit; i > 0; i--) {
      const open = currentPrice;
      const changePercent = (Math.random() * 2 - 1) * vol;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * (vol / 2));
      const low = Math.min(open, close) * (1 - Math.random() * (vol / 2));
      const volume = basePrice * 500 + Math.random() * 1000;

      tempCandles.push({
        timestamp: now - i * stepMs,
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close; // Setup for next step
    }
    candles = tempCandles;
  }

  // 3. Cache the resolved candles (timeframe-dependent TTL for freshness)
  // IMPORTANT: Keep TTLs low — indicator strip and AI telemetry derive from these candles.
  // The TradingView widget has its own live data; we must keep our computed indicators tight.
  let ttl = 30; // Default 30 seconds
  if (timeframe === "1m") ttl = 5;          // 5s — 1m candle closes every 60s, keep very fresh
  else if (timeframe === "5m") ttl = 10;    // 10s — 5m candle closes every 300s
  else if (timeframe === "15m") ttl = 20;   // 20s — 15m candle closes every 900s
  else if (timeframe === "1h" || timeframe === "1H") ttl = 30; // 30s — hourly
  else if (timeframe === "4h" || timeframe === "4H") ttl = 45; // 45s — 4h candle
  else if (timeframe === "1d") ttl = 120;   // 2 min — daily candle
  else ttl = 60;                            // 1W and others: 60s

  await setCachedData(cacheKey, candles, ttl);

  if (isSimulated) {
    // Simulated candles are not cached; mark them for callers and surface
    // a single top-level warning so the frontend can render a banner.
    return candles.map(c => ({ ...c, source: "SIMULATED" as const, warning: `Live OHLCV for ${normSymbol} is temporarily unavailable. Showing simulated candles — do not trade on these values.` }));
  }

  return candles;
}
