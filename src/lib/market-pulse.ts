import { getCachedData, setCachedData } from "./cache";
import { getLivePrice } from "./market";
import { getPopularSymbols } from "./supported-symbols";

// The "trending assets" surfaced by the market pulse are the registry's
// popular crypto instruments. Deriving them from the registry (rather than a
// hardcoded `["BTC/USD","ETH/USD","SOL/USD"]`) means the pulse tracks the
// curated set automatically. `displayName` → UI name; the base currency
// (before "/") → the short ticker.
const TRENDING_CRYPTO = getPopularSymbols().filter((s) => s.assetClass === "CRYPTO").slice(0, 3);

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
}

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
  // Static fallback derived from the registry's baseline prices so the pulse
  // still shows the curated set (with neutral change) when live prices fail.
  let trendingAssets = TRENDING_CRYPTO.map((s) => ({
    name: s.displayName,
    symbol: s.symbol.split("/")[0],
    price: s.baselinePrice,
    change24h: 0,
  }));

  try {
    const live = await Promise.all(TRENDING_CRYPTO.map((s) => getLivePrice(s.symbol)));
    trendingAssets = TRENDING_CRYPTO.map((s, i) => ({
      name: s.displayName,
      symbol: s.symbol.split("/")[0],
      price: live[i].price,
      change24h: live[i].changePercent24h,
    }));
  } catch (err) {
    console.error("Failed to fetch live trending assets:", err);
  }

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
  };

  // Cache for 6 hours (21600 seconds)
  await setCachedData(cacheKey, result, 21600);

  return result;
}
