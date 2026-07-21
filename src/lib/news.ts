import { prisma } from "./prisma";
import { getCachedData, setCachedData } from "./cache";
import { classifyArticle } from "./news-classifier";

export interface NewsStory {
  id: string;
  source: string; // publisher
  publisher: string;
  headline: string; // title
  title: string;
  summary: string;
  url: string;
  sentiment: number; // compatibility (-1 to +1)
  importance: number; // compatibility (1 to 5)
  affectedAssets: string[];
  publishedAt: string; // ISO String
  publishedTime: string;

  // Rich UI attributes
  image?: string;
  sentimentLabel: "Bullish" | "Bearish" | "Neutral";
  sentimentConfidence: number;
  impactScore: "Low" | "Medium" | "High";
  sourceLogo?: string;
  category: string;
  isCached?: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (_) {
    return "";
  }
}

function determineAffectedAssets(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const assets: string[] = [];

  if (/\b(btc|bitcoin|xbt)\b/.test(text)) assets.push("BTC/USD");
  if (/\b(eth|ethereum)\b/.test(text)) assets.push("ETH/USD");
  if (/\b(sol|solana)\b/.test(text)) assets.push("SOL/USD");
  if (/\b(eur|euro|ecb)\b/.test(text)) assets.push("EUR/USD");
  if (/\b(gbp|sterling|pound|boe)\b/.test(text)) assets.push("GBP/USD");
  if (/\b(jpy|yen|boj)\b/.test(text)) assets.push("USD/JPY");
  if (/\b(xau|gold|bullion)\b/.test(text)) assets.push("XAU/USD");
  if (/\b(nasdaq|qqq|s&p|dow|spx|stock|fed|rate|inflation|cpi|interest)\b/.test(text)) assets.push("NASDAQ");

  return assets;
}

function parseFinnhubArticle(item: any): NewsStory {
  const title = item.headline || "";
  const summary = item.summary || "";
  const publisher = item.source || "Finnhub";
  const url = item.url || "";
  const image = item.image || undefined;
  
  const affectedAssets = determineAffectedAssets(title, summary);
  const classification = classifyArticle(title, summary, publisher, affectedAssets.length);
  
  const publishedAt = item.datetime 
    ? new Date(item.datetime * 1000).toISOString() 
    : new Date().toISOString();

  return {
    id: `finnhub_${item.id}`,
    source: publisher,
    headline: title,
    summary,
    url,
    sentiment: classification.sentimentScore,
    importance: classification.importance,
    affectedAssets,
    publishedAt,
    
    title,
    publisher,
    publishedTime: publishedAt,
    image,
    sentimentLabel: classification.sentiment,
    sentimentConfidence: classification.confidence,
    impactScore: classification.impactScore,
    sourceLogo: url ? `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(url)}` : undefined,
    category: item.category || "general",
  };
}

function parseNewsAPIArticle(item: any, idIndex: number): NewsStory {
  const title = item.title || "";
  const summary = item.description || item.content || "";
  const publisher = item.source?.name || "NewsAPI";
  const url = item.url || "";
  const image = item.urlToImage || undefined;
  
  const affectedAssets = determineAffectedAssets(title, summary);
  const classification = classifyArticle(title, summary, publisher, affectedAssets.length);
  const publishedAt = item.publishedAt ? new Date(item.publishedAt).toISOString() : new Date().toISOString();

  return {
    id: `newsapi_${idIndex}_${item.url ? encodeURIComponent(item.url).substring(0, 30) : Math.random()}`,
    source: publisher,
    headline: title,
    summary,
    url,
    sentiment: classification.sentimentScore,
    importance: classification.importance,
    affectedAssets,
    publishedAt,
    
    title,
    publisher,
    publishedTime: publishedAt,
    image,
    sentimentLabel: classification.sentiment,
    sentimentConfidence: classification.confidence,
    impactScore: classification.impactScore,
    sourceLogo: url ? `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(url)}` : undefined,
    category: "general",
  };
}

function parseDbArticle(dbItem: any): NewsStory {
  const title = dbItem.headline || "";
  const summary = dbItem.summary || "";
  const publisher = dbItem.source || "Market News";
  const url = dbItem.url || "";
  const sentimentScore = Number(dbItem.sentiment || 0);
  const importance = dbItem.importance || 2;
  const affectedAssets = dbItem.affectedAssets || [];
  const publishedAt = new Date(dbItem.publishedAt).toISOString();
  
  const classification = classifyArticle(title, summary, publisher, affectedAssets.length);

  return {
    id: dbItem.id,
    source: publisher,
    headline: title,
    summary,
    url,
    sentiment: sentimentScore,
    importance,
    affectedAssets,
    publishedAt,
    
    title,
    publisher,
    publishedTime: publishedAt,
    sentimentLabel: classification.sentiment,
    sentimentConfidence: classification.confidence,
    impactScore: classification.impactScore,
    sourceLogo: url ? `https://www.google.com/s2/favicons?sz=64&domain=${getDomain(url)}` : undefined,
    category: "general",
    isCached: true,
  };
}

// Map requested symbols to target Finnhub categories
function getFinnhubCategoriesForSymbol(symbol?: string): string[] {
  if (!symbol) return ["general", "forex", "crypto"];
  const norm = symbol.toUpperCase();
  if (norm.includes("BTC") || norm.includes("ETH") || norm.includes("SOL")) return ["crypto"];
  if (norm.includes("EUR") || norm.includes("GBP") || norm.includes("JPY")) return ["forex"];
  return ["general"];
}

// Map requested symbols to NewsAPI query queries
function getNewsAPIQueryForSymbol(symbol?: string): string {
  if (!symbol) return "financial markets OR stock market OR crypto OR forex";
  const norm = symbol.toUpperCase();
  if (norm.includes("BTC")) return "Bitcoin OR BTC";
  if (norm.includes("ETH")) return "Ethereum OR ETH";
  if (norm.includes("SOL")) return "Solana OR SOL";
  if (norm.includes("EUR")) return "EUR OR Euro OR ECB";
  if (norm.includes("GBP")) return "GBP OR Pound Sterling OR BOE";
  if (norm.includes("JPY")) return "JPY OR Japanese Yen OR BOJ";
  if (norm.includes("XAU")) return "Gold OR XAU OR Gold Price";
  if (norm.includes("NASDAQ")) return "NASDAQ OR QQQ OR stock market";
  return norm;
}

export async function getNewsFeed(
  symbol?: string,
  page: number = 1,
  limit: number = 10
): Promise<NewsStory[]> {
  const cleanSymbol = symbol === "ALL" ? undefined : symbol;
  const cacheKey = `news:feed:${cleanSymbol || "all"}:p${page}:l${limit}`;

  // 1. Try cache (5 minutes TTL = 300 seconds)
  const cached = await getCachedData<NewsStory[]>(cacheKey);
  if (cached) {
    console.log(`[NEWS FEED] Cache hit for ${cacheKey}`);
    return cached;
  }

  let liveStories: NewsStory[] = [];
  let apiSucceeded = false;

  // 2. Fetch from Finnhub API (Primary)
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey && finnhubKey !== "mock-key") {
    try {
      console.log(`[NEWS FEED] Fetching from Finnhub for symbol ${cleanSymbol || "ALL"}`);
      const categories = getFinnhubCategoriesForSymbol(cleanSymbol);
      
      const fetchPromises = categories.map(async (cat) => {
        const url = `https://finnhub.io/api/v1/news?category=${cat}&token=${finnhubKey}`;
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Finnhub returned ${res.status}`);
        const items = await res.json();
        return Array.isArray(items) ? items : [];
      });

      const results = await Promise.all(fetchPromises);
      const allItems = results.flat();
      
      liveStories = allItems.map((item) => parseFinnhubArticle(item));
      apiSucceeded = true;
      console.log(`[NEWS FEED] Finnhub returned ${liveStories.length} stories`);
    } catch (err) {
      console.error("[NEWS FEED] Finnhub fetch failed:", err);
    }
  }

  // 3. Fallback to NewsAPI if Finnhub failed or returned no items
  if (!apiSucceeded || liveStories.length === 0) {
    const newsApiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_API_KEY;
    if (newsApiKey && newsApiKey !== "mock-key") {
      try {
        console.log(`[NEWS FEED] Falling back to NewsAPI for symbol ${cleanSymbol || "ALL"}`);
        const query = getNewsAPIQueryForSymbol(cleanSymbol);
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=30&apiKey=${newsApiKey}`;
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`NewsAPI returned ${res.status}`);
        const data = await res.json();
        
        if (data.articles && Array.isArray(data.articles)) {
          liveStories = data.articles.map((item: any, idx: number) => parseNewsAPIArticle(item, idx));
          apiSucceeded = true;
          console.log(`[NEWS FEED] NewsAPI returned ${liveStories.length} stories`);
        }
      } catch (err) {
        console.error("[NEWS FEED] NewsAPI fallback failed:", err);
      }
    }
  }

  // 4. Save newly fetched articles to the News DB model (for persistence & fallback)
  if (liveStories.length > 0) {
    console.log(`[NEWS FEED] Persisting ${liveStories.length} articles to database`);
    for (const story of liveStories) {
      try {
        await prisma.news.upsert({
          where: { url: story.url },
          update: {
            source: story.source,
            headline: story.headline,
            summary: story.summary,
            sentiment: story.sentiment,
            importance: story.importance,
            affectedAssets: story.affectedAssets,
            publishedAt: new Date(story.publishedAt),
          },
          create: {
            source: story.source,
            headline: story.headline,
            summary: story.summary,
            url: story.url,
            sentiment: story.sentiment,
            importance: story.importance,
            affectedAssets: story.affectedAssets,
            publishedAt: new Date(story.publishedAt),
          },
        });
      } catch (_e) {
        // Log clean or ignore constraint updates
      }
    }
  }

  // 5. Query consolidated news from the database (ensuring deduplication and clean fallback)
  const dbItems = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100, // Limit historical pool size
  });

  let stories = dbItems.map((dbItem: any) => parseDbArticle(dbItem));

  // 5b. No fallback — never fabricate news. Return empty if APIs and DB are both empty.
  if (stories.length === 0) {
    console.log("[NEWS FEED] No news available from APIs or database. Returning empty feed.");
  }

  // 6. Strict Asset Isolation (Asset Filtering)
  if (cleanSymbol) {
    const norm = cleanSymbol.toUpperCase();
    stories = stories.filter((story: NewsStory) =>
      story.affectedAssets.some(
        (asset: string) => asset.toUpperCase().includes(norm) || norm.includes(asset.toUpperCase())
      )
    );
  }

  // 7. Pagination
  const startIndex = (page - 1) * limit;
  const paginated = stories.slice(startIndex, startIndex + limit);

  // 8. Cache the paginated result for 5 minutes (300 seconds)
  await setCachedData(cacheKey, paginated, 300);

  return paginated;
}
