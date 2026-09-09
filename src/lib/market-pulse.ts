import { getCachedData, setCachedData } from "./cache";
import { getLivePrice } from "./market";
import { buildMarketSnapshot } from "./market-snapshot";

export interface MarketPulseResponse {
  fearGreed: {
    value: number;
    sentiment: string;
    timestamp: string;
  };
  fundingRates: Array<{
    symbol: string;
    rate: number;
    time: string;
  }>;
  trendingAssets: Array<{
    name: string;
    symbol: string;
    price: number;
    change24h: number;
  }>;
  /** V4.1: live ticker map keyed by display symbol (BTC/USD, EUR/USD, etc.) */
  tickers: Record<
    string,
    {
      price: number;
      change24h: number;
      changePercent24h: number;
      high24h: number;
      low24h: number;
      volume24h: number;
      source?: "LIVE" | "SIMULATED";
      warning?: string;
      freshness?: "FRESH" | "STALE" | "UNAVAILABLE";
    }
  >;
  /** V4.1: per-symbol regime snapshot keyed by display symbol. */
  regimes: Record<
    string,
    {
      regime: string;
      regimeReasons: string[];
      mtfAlignment?: string;
      freshness?: "FRESH" | "STALE" | "UNAVAILABLE";
    }
  >;
}

const WATCHLIST_SYMBOLS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
  "NASDAQ",
  "S&P500",
];

export async function getMarketPulse(): Promise<MarketPulseResponse> {
  const cacheKey = "market:pulse";

  // 1. Try cache (1 hour TTL)
  const cached = await getCachedData<MarketPulseResponse>(cacheKey);
  if (cached) return cached;

  let fearGreed = { value: 50, sentiment: "Neutral", timestamp: new Date().toISOString() };
  let fundingRates = [
    { symbol: "BTCUSDT", rate: 0.0001, time: new Date().toISOString() },
    { symbol: "ETHUSDT", rate: 0.00012, time: new Date().toISOString() },
  ];
  let trendingAssets = [
    { name: "Bitcoin", symbol: "BTC", price: 68250, change24h: 1.2 },
    { name: "Ethereum", symbol: "ETH", price: 3480, change24h: -0.4 },
    { name: "Solana", symbol: "SOL", price: 142.5, change24h: 4.8 },
  ];

  // V4.1: build an honest ticker map for all watchlisted symbols.
  const tickers: MarketPulseResponse["tickers"] = {};
  const regimes: MarketPulseResponse["regimes"] = {};

  try {
    const [btc, eth, sol] = await Promise.all([
      getLivePrice("BTC/USD"),
      getLivePrice("ETH/USD"),
      getLivePrice("SOL/USD"),
    ]);
    trendingAssets = [
      { name: "Bitcoin", symbol: "BTC", price: btc.price, change24h: btc.changePercent24h },
      { name: "Ethereum", symbol: "ETH", price: eth.price, change24h: eth.changePercent24h },
      { name: "Solana", symbol: "SOL", price: sol.price, change24h: sol.changePercent24h },
    ];
  } catch (err) {
    console.error("Failed to fetch live trending assets:", err);
  }

  // V4.1: parallel fetch of live prices for the watchlist surface.
  await Promise.all(
    WATCHLIST_SYMBOLS.map(async (symbol) => {
      try {
        const price = await getLivePrice(symbol);
        tickers[symbol] = {
          price: price.price,
          change24h: price.change24h,
          changePercent24h: price.changePercent24h,
          high24h: price.high24h,
          low24h: price.low24h,
          volume24h: price.volume24h,
          source: price.source,
          warning: price.warning,
          freshness: price.source === "SIMULATED" ? "UNAVAILABLE" : "FRESH",
        };
      } catch (err) {
        console.warn(`Market pulse price fetch failed for ${symbol}:`, err);
      }
    })
  );

  // V4.1: parallel regime snapshots for the watchlist surface.
  await Promise.all(
    WATCHLIST_SYMBOLS.map(async (symbol) => {
      try {
        const snapshot = await buildMarketSnapshot(symbol, "1h");
        if (snapshot.snapshot) {
          regimes[symbol] = {
            regime: snapshot.snapshot.marketContext.regime,
            regimeReasons: snapshot.snapshot.marketContext.regimeReasons,
            mtfAlignment: snapshot.snapshot.marketContext.mtfAlignment,
            freshness: snapshot.snapshot.dataFreshness.status,
          };
        }
      } catch (err) {
        console.warn(`Market pulse regime snapshot failed for ${symbol}:`, err);
      }
    })
  );

  try {
    // Fetch Fear & Greed Index
    const fngRes = await fetch("https://api.alternative.me/fng/?limit=1", {
      signal: AbortSignal.timeout(4000),
    });
    if (fngRes.ok) {
      const data = await fngRes.json();
      if (data.data && data.data.length > 0) {
        const item = data.data[0];
        fearGreed = {
          value: parseInt(item.value, 10),
          sentiment: item.value_classification,
          timestamp: new Date(parseInt(item.timestamp, 10) * 1000).toISOString(),
        };
      }
    }

    // Fetch Binance Futures Funding Rate
    const fundingRes = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex", {
      signal: AbortSignal.timeout(4000),
    });
    if (fundingRes.ok) {
      const data = await fundingRes.json();
      if (Array.isArray(data)) {
        fundingRates = data
          .filter((item: any) => ["BTCUSDT", "ETHUSDT", "SOLUSDT"].includes(item.symbol))
          .map((item: any) => ({
            symbol: item.symbol,
            rate: parseFloat(item.lastFundingRate),
            time: new Date(item.nextFundingTime).toISOString(),
          }));
      }
    }
  } catch (err) {
    console.error("Market pulse upstream API fetch failed, using default/mock values:", err);
  }

  const result: MarketPulseResponse = {
    fearGreed,
    fundingRates,
    trendingAssets,
    tickers,
    regimes,
  };

  // Cache for 6 hours (21600 seconds)
  await setCachedData(cacheKey, result, 21600);

  return result;
}
