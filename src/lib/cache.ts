import { prisma } from "@/lib/prisma";

// L1 Local Process Cache for 0ms retrieval and DB load mitigation.
//
// The previous implementation used an unbounded Map: every distinct cacheKey
// inserted a new entry that was never evicted (only deleted on a later
// expiry read). In a long-lived process — or a serverless instance reused
// across many warm requests — the set of distinct symbol/timeframe keys is
// open-ended, so the Map grew without bound (a slow memory leak). We bound
// it to MAX_L1_ENTRIES with approximate LRU eviction: on a cache hit we
// re-insert the entry (Map preserves insertion order, so this moves it to
// the "most recently used" tail); on insert at capacity we drop the
// least-recently-used head. This keeps hot keys resident and bounds memory.
export const MAX_L1_ENTRIES = 1000;

const localCache = new Map<string, { data: any; expiresAt: number }>();

function evictExpired(key: string): void {
  localCache.delete(key);
}

function touchL1(key: string, item: { data: any; expiresAt: number }): void {
  // Re-insert so the key moves to the tail of the Map's insertion order,
  // marking it most-recently-used. Cheap relative to a DB round-trip.
  localCache.delete(key);
  localCache.set(key, item);
}

function evictLruIfNeeded(): void {
  while (localCache.size >= MAX_L1_ENTRIES) {
    // keys().next().value is the oldest insertion (least-recently-used).
    const oldest = localCache.keys().next().value;
    if (oldest === undefined) break;
    localCache.delete(oldest);
  }
}

export async function getCachedData<T>(cacheKey: string): Promise<T | null> {
  // 1. Try L1 memory cache first (0ms latency, zero DB connections)
  const localItem = localCache.get(cacheKey);
  if (localItem) {
    if (Date.now() < localItem.expiresAt) {
      touchL1(cacheKey, localItem);
      return localItem.data as T;
    } else {
      evictExpired(cacheKey);
    }
  }

  // 2. Try L2 database cache
  try {
    const cached = await prisma.marketCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) return null;

    const expiresAtTime = new Date(cached.expiresAt).getTime();
    if (Date.now() > expiresAtTime) {
      // Background cleanup of expired cache item
      prisma.marketCache.deleteMany({ where: { cacheKey } }).catch((err: any) => {
        console.error("Failed to delete expired cache key:", cacheKey, err);
      });
      return null;
    }

    // Populate L1 cache to speed up subsequent reads
    evictLruIfNeeded();
    localCache.set(cacheKey, { data: cached.data, expiresAt: expiresAtTime });
    return cached.data as T;
  } catch (error) {
    console.error("Cache get error for key:", cacheKey, error);
    return null;
  }
}

export async function setCachedData<T>(
  cacheKey: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  const expiresAtTime = Date.now() + ttlSeconds * 1000;

  // 1. Write to L1 local memory cache (bounded — evict LRU first)
  evictLruIfNeeded();
  localCache.set(cacheKey, { data, expiresAt: expiresAtTime });

  // 2. Write to L2 database cache
  try {
    const expiresAt = new Date(expiresAtTime);

    await prisma.marketCache.upsert({
      where: { cacheKey },
      update: {
        data: data as any,
        expiresAt,
      },
      create: {
        cacheKey,
        data: data as any,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Cache set error for key:", cacheKey, error);
  }
}