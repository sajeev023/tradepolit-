import { prisma } from "./prisma";
import { getCachedData, setCachedData } from "./cache";
import { classifyArticle } from "./news-classifier";
import { redactKey } from "./startup";
import {
  determineAffectedAssets,
  newsCategoryFor,
  newsQueryFor,
} from "./supported-symbols";

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

  // Provenance — which upstream API the story was first sourced from.
  // UI may surface this so users know the source. Defaults to "DB" for
  // items served only from the persisted cache.
  provider?: "FINNHUB" | "NEWSAPI" | "DB";
}

/**
 * Normalize a headline for cross-source dedupe. Two stories with the same
 * "shape" but different URLs (e.g. the same press release syndicated via
 * Finnhub and NewsAPI) should collapse into one.
 *
 * Strategy: lowercase, strip non-alphanumeric, take the first 80 chars.
 * Cheap and good-enough for headline-level dedupe; avoids the heavier
 * Jaccard / shingle approach.
 */
function titleFingerprint(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (_) {
    return "";
  }
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
    provider: "FINNHUB",
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
    provider: "NEWSAPI",
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
    // DB-only items are tagged with the provider that originally wrote
    // them, or "DB" if provenance is unknown (e.g. legacy rows).
    provider: (dbItem as any).provider ?? "DB",
  };
}

export async function getNewsFeed(
  symbol?: string,
  page: number = 1,
  limit: number = 10,
  signal?: AbortSignal
): Promise<NewsStory[]> {
  const cleanSymbol = symbol === "ALL" ? undefined : symbol;
  const cacheKey = `news:feed:${cleanSymbol || "all"}:p${page}:l${limit}`;

  // Compose the caller-supplied cancellation signal (route timeout / client
  // disconnect) with the per-fetch 5s timeout. If the caller cancels, every
  // in-flight upstream fetch aborts immediately instead of running to
  // completion. AbortSignal.any ignores any non-AbortSignal entries, so we
  // filter out the undefined caller signal.
  const fetchSignal = (timeoutMs: number): AbortSignal => {
    const timeout = AbortSignal.timeout(timeoutMs);
    if (!signal) return timeout;
    return AbortSignal.any([signal, timeout]);
  };

  // 1. Try cache (5 minutes TTL = 300 seconds)
  const cached = await getCachedData<NewsStory[]>(cacheKey);
  if (cached) {
    console.log(`[News] Cache hit for ${cacheKey}`);
    return cached;
  }

  // 2. Fetch Finnhub + NewsAPI in PARALLEL. Each independently
  // populates the live stories list; the two sources are merged
  // and deduped (by URL + by title fingerprint) below.
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_API_KEY;

  const fetchFinnhub = async (): Promise<NewsStory[]> => {
    if (!finnhubKey || finnhubKey === "mock-key" || finnhubKey === "placeholder-key") {
      console.log(`[News] Finnhub ✗ key missing`);
      return [];
    }
    try {
      console.log(`[News] Finnhub → fetching for ${cleanSymbol || "ALL"}`);
      const categories = newsCategoryFor(cleanSymbol);
      const fetchPromises = categories.map(async (cat) => {
        const url = `https://finnhub.io/api/v1/news?category=${cat}&token=${finnhubKey}`;
        const res = await fetch(url, { cache: "no-store", signal: fetchSignal(5000) });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 429) {
            console.error(
              `[News-Key-Loaded] env=FINNHUB_API_KEY provider=finnhub` +
              ` redacted=${redactKey(process.env.FINNHUB_API_KEY)}` +
              ` status=${res.status} category=${cat}` +
              ` | Verify: (1) Vercel env, (2) Finnhub dashboard, (3) request shape.`
            );
          }
          throw new Error(`Finnhub returned ${res.status}`);
        }
        const items = await res.json();
        return Array.isArray(items) ? items : [];
      });
      const results = await Promise.all(fetchPromises);
      const allItems = results.flat();
      const parsed = allItems.map((item) => parseFinnhubArticle(item));
      console.log(`[News] Finnhub ← ${parsed.length} stories`);
      return parsed;
    } catch (err) {
      console.error(`[News] Finnhub ✗ ${(err as Error).message}`);
      return [];
    }
  };

  const fetchNewsAPI = async (): Promise<NewsStory[]> => {
    if (!newsApiKey || newsApiKey === "mock-key" || newsApiKey === "placeholder-key") {
      console.log(`[News] NewsAPI ✗ key missing`);
      return [];
    }
    try {
      console.log(`[News] NewsAPI → fetching for ${cleanSymbol || "ALL"}`);
      const query = newsQueryFor(cleanSymbol);
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=30&apiKey=${newsApiKey}`;
      const res = await fetch(url, { cache: "no-store", signal: fetchSignal(5000) });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          console.error(
            `[News-Key-Loaded] env=NEWS_API_KEY provider=newsapi` +
            ` redacted=${redactKey(process.env.NEWS_API_KEY ?? process.env.NEWSAPI_API_KEY)}` +
            ` status=${res.status} query=${query}` +
            ` | Verify: (1) Vercel env, (2) NewsAPI dashboard, (3) request shape.`
          );
        }
        throw new Error(`NewsAPI returned ${res.status}`);
      }
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        const parsed = data.articles.map((item: any, idx: number) => parseNewsAPIArticle(item, idx));
        console.log(`[News] NewsAPI ← ${parsed.length} stories`);
        return parsed;
      }
      return [];
    } catch (err) {
      console.error(`[News] NewsAPI ✗ ${(err as Error).message}`);
      return [];
    }
  };

  const [finnhubStories, newsApiStories] = await Promise.all([fetchFinnhub(), fetchNewsAPI()]);

  // 3. Cross-source dedupe. Two stories collide if they share the same
  // URL (already unique-constrained in the DB) OR the same title
  // fingerprint (catches syndication with different URLs).
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();
  const liveStories: NewsStory[] = [];
  for (const story of [...finnhubStories, ...newsApiStories]) {
    if (!story.url) continue;
    if (seenUrls.has(story.url)) continue;
    const fp = titleFingerprint(story.headline || story.title);
    if (fp && seenFingerprints.has(fp)) continue;
    seenUrls.add(story.url);
    if (fp) seenFingerprints.add(fp);
    liveStories.push(story);
  }

  // 4. Persist newly fetched stories to the News DB model.
  if (liveStories.length > 0) {
    console.log(`[News] Persisting ${liveStories.length} stories to database`);
    for (let i = 0; i < liveStories.length; i++) {
      // If the caller cancelled (route timeout / client disconnect), stop
      // writing — there's no point persisting for a response that will
      // never be delivered, and the next request will re-fetch anyway.
      if (signal?.aborted) {
        console.log(`[News] Caller aborted — stopping upsert loop after ${i} writes`);
        break;
      }
      const story = liveStories[i];
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
            // Persist provider on the DB row so historical provenance
            // survives across cache refreshes.
            ...(story.provider ? { provider: story.provider } : {}),
          } as any,
          create: {
            source: story.source,
            headline: story.headline,
            summary: story.summary,
            url: story.url,
            sentiment: story.sentiment,
            importance: story.importance,
            affectedAssets: story.affectedAssets,
            publishedAt: new Date(story.publishedAt),
            ...(story.provider ? { provider: story.provider } : {}),
          } as any,
        });
      } catch (_e) {
        // Log clean or ignore constraint updates
      }
    }
  }

  // 5. Always read from DB so deduplication is consistent across
  // the live + persisted pool. The DB row has a unique constraint
  // on `url`, so duplicates are already collapsed at the row level.
  const dbItems = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  let stories = dbItems.map((dbItem: any) => parseDbArticle(dbItem));

  if (stories.length === 0) {
    console.log(`[News] No news available from APIs or database. Returning empty feed.`);
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
