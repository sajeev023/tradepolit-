import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classifyArticle } from "./news-classifier";
import { getNewsFeed } from "./news";
import { prisma } from "./prisma";

// Mock Prisma
vi.mock("./prisma", () => ({
  prisma: {
    news: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock Cache
vi.mock("./cache", () => ({
  getCachedData: vi.fn().mockResolvedValue(null),
  setCachedData: vi.fn().mockResolvedValue(undefined),
}));

// Save original fetch so the cross-source tests can swap it in/out
// without permanently mutating the test environment.
const originalFetch = globalThis.fetch;

describe("Market Intelligence News Classifier Heuristics", () => {
  it("classifies bullish headlines correctly", () => {
    const res = classifyArticle(
      "Bitcoin Surges Past Key Resistance as Instutitional Inflows Rally",
      "Buyers maintain control driving spot price upwards.",
      "Reuters",
      1
    );
    expect(res.sentiment).toBe("Bullish");
    expect(res.sentimentScore).toBeGreaterThan(0);
    expect(res.confidence).toBeGreaterThan(0.5);
  });

  it("classifies bearish headlines correctly", () => {
    const res = classifyArticle(
      "Gold Prices Slump as High Inflation Concerns Plunge Markets",
      "Sellers dump precious metal holdings on interest rate hikes.",
      "CNBC",
      1
    );
    expect(res.sentiment).toBe("Bearish");
    expect(res.sentimentScore).toBeLessThan(0);
    expect(res.confidence).toBeGreaterThan(0.5);
  });

  it("classifies neutral headlines correctly", () => {
    const res = classifyArticle(
      "EUR/USD Trades Flat Ahead of Afternoon Fed Statement",
      "Exchange rates remain unchanged in quiet morning consolidation.",
      "MarketWatch",
      1
    );
    expect(res.sentiment).toBe("Neutral");
    expect(res.sentimentScore).toBe(0);
    expect(res.confidence).toBe(0.5);
  });

  it("evaluates impact score based on credibility, keyword and assets count", () => {
    // Bloomberg + High impact keyword "fed" + multiple assets
    const resHigh = classifyArticle(
      "Fed Decision Sparks Massive Breakout Across Forex Markets",
      "Federal reserve signals emergency policy changes.",
      "Bloomberg",
      3
    );
    expect(resHigh.impactScore).toBe("High");
    expect(resHigh.importance).toBe(5);

    // Minor source, generic text
    const resLow = classifyArticle(
      "Quiet consolidation continues",
      "Minor trading range bound range.",
      "Unknown Source",
      0
    );
    expect(resLow.impactScore).toBe("Low");
    expect(resLow.importance).toBe(1);
  });
});

describe("Market News Feed API & Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to database cache if API keys are mock/missing and returns correctly filtered symbol news", async () => {
    const mockDbArticles = [
      {
        id: "db_1",
        source: "Bloomberg",
        headline: "Bitcoin Spot ETFs Spark Massive Liquidity Surge",
        summary: "BTC inflows surge to record high levels on institutional volumes.",
        url: "https://bloomberg.com/btc",
        sentiment: 0.8,
        importance: 5,
        affectedAssets: ["BTC/USD"],
        publishedAt: new Date(),
      },
      {
        id: "db_2",
        source: "Reuters",
        headline: "Euro Declines Against US Dollar Following Weak Retail Figures",
        summary: "EUR/USD breaks key support level as eurozone growth drops.",
        url: "https://reuters.com/eur",
        sentiment: -0.6,
        importance: 3,
        affectedAssets: ["EUR/USD"],
        publishedAt: new Date(Date.now() - 10000),
      },
    ];

    vi.mocked(prisma.news.findMany).mockResolvedValue(mockDbArticles as any);

    // Retrieve BTC/USD news feed
    const btcFeed = await getNewsFeed("BTC/USD", 1, 10);

    expect(btcFeed.length).toBe(1);
    expect(btcFeed[0].id).toBe("db_1");
    expect(btcFeed[0].sentimentLabel).toBe("Bullish");
    expect(btcFeed[0].isCached).toBe(true);

    // Retrieve EUR/USD news feed
    const eurFeed = await getNewsFeed("EUR/USD", 1, 10);
    expect(eurFeed.length).toBe(1);
    expect(eurFeed[0].id).toBe("db_2");
    expect(eurFeed[0].sentimentLabel).toBe("Bearish");

    // Pagination limit check
    const limitedFeed = await getNewsFeed(undefined, 1, 1);
    expect(limitedFeed.length).toBe(1);
  });
});

describe("Cross-source news dedupe", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let persistedRows: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FINNHUB_API_KEY", "test-finnhub");
    vi.stubEnv("NEWS_API_KEY", "test-newsapi");
    persistedRows = [];
    // The DB row surfaces what was upserted; the upsert payload has `url`
    // and `headline` so findMany can re-read them.
    vi.mocked(prisma.news.upsert).mockImplementation((async ({ where, create, update }: any) => {
      const existing = persistedRows.find(r => r.url === where.url);
      const row = { id: existing?.id ?? `db_${persistedRows.length + 1}`, ...create, ...update };
      if (!existing) persistedRows.push(row);
      else Object.assign(existing, row);
      return row;
    }) as any);
    vi.mocked(prisma.news.findMany).mockImplementation((async () =>
      [...persistedRows].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    ) as any);
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    (globalThis as any).fetch = originalFetch;
  });

  it("dedupes the same story from Finnhub and NewsAPI by title fingerprint", async () => {
    const sharedHeadline = "Bitcoin Breaks 70k as ETF Inflows Hit Record";
    fetchMock
      // Finnhub call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 101,
            headline: sharedHeadline,
            summary: "BTC pushes higher on volume.",
            source: "Finnhub Source",
            url: "https://finnhub.example.com/btc-70k",
            datetime: Math.floor(Date.now() / 1000),
            image: "",
            category: "crypto",
          },
        ],
      })
      // NewsAPI call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            {
              title: sharedHeadline,
              description: "Bitcoin rallied to 70k today.",
              source: { name: "NewsAPI Source" },
              url: "https://newsapi.example.com/bitcoin-70k-record",
              urlToImage: "",
              publishedAt: new Date().toISOString(),
              content: "...",
            },
          ],
        }),
      });

    const feed = await getNewsFeed("BTC/USD", 1, 10);
    // Both fetches ran in parallel
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Title-fingerprint dedupe collapsed them to one
    expect(feed.length).toBe(1);
  });

  it("keeps stories with different titles even if they share assets", async () => {
    // Stub the mock per call (don't share a mockResolvedValueOnce chain
    // across tests — vitest 4 has a bug where queued implementations on
    // a vi.fn() are consumed by tests in unexpected orders when the
    // mock is reassigned via globalThis.fetch).
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("finnhub")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              headline: "Bitcoin ETF inflows surge",
              summary: "BTC ETF flow.",
              source: "Finnhub",
              url: "https://a.example/1",
              datetime: Math.floor(Date.now() / 1000),
              image: "",
              category: "crypto",
            },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({
          articles: [
            {
              title: "Gold prices climb on inflation data",
              description: "XAU/USD trading higher.",
              source: { name: "NewsAPI" },
              url: "https://b.example/2",
              urlToImage: "",
              publishedAt: new Date().toISOString(),
              content: "...",
            },
          ],
        }),
      };
    });

    const feed = await getNewsFeed(undefined, 1, 10);
    expect(feed.length).toBe(2);
  });
});
