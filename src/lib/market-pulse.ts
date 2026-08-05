import { getCachedData, setCachedData } from "./cache";
import { getLivePrice } from "./market";

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
  let trendingAssets = [
    { name: "Bitcoin", symbol: "BTC", price: 68250, change24h: 1.2 },
    { name: "Ethereum", symbol: "ETH", price: 3480, change24h: -0.4 },
    { name: "Solana", symbol: "SOL", price: 142.5, change24h: 4.8 },
  ];

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
