import { prisma } from "@/lib/prisma";

/**
 * Two-tier cache: L1 in-process Map + L2 Postgres (MarketCache).
 *
 * V2: L1 is now bounded (LRU-ish). The previous unbounded Map only
 * evicted lazily on read-after-expiry — keys that were never read
 * again accumulated for the process lifetime, a slow memory leak on
 * long-lived instances. Reads refresh recency; inserts over the cap
 * evict the least-recently-used entry.
 */

const L1_MAX_ENTRIES = 512;

const localCache = new Map<string, { data: any; expiresAt: number }>();

function l1Get(key: string): { data: any; expiresAt: number } | undefined {
  const item = localCache.get(key);
  if (!item) return undefined;
  if (Date.now() >= item.expiresAt) {
    localCache.delete(key);
    return undefined;
  }
  // Refresh recency (Map preserves insertion order; delete+set moves
  // the key to the newest position = LRU semantics).
  localCache.delete(key);
  localCache.set(key, item);
  return item;
}

function l1Set(key: string, item: { data: any; expiresAt: number }) {
  if (localCache.has(key)) localCache.delete(key);
  localCache.set(key, item);
  if (localCache.size > L1_MAX_ENTRIES) {
    // Evict the oldest (least-recently-used) entry.
    const oldestKey = localCache.keys().next().value;
    if (oldestKey !== undefined) localCache.delete(oldestKey);
  }
}

export async function getCachedData<T>(cacheKey: string): Promise<T | null> {
  // 1. Try L1 memory cache first (0ms latency, zero DB connections)
  const localItem = l1Get(cacheKey);
  if (localItem) {
    return localItem.data as T;
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
    l1Set(cacheKey, { data: cached.data, expiresAt: expiresAtTime });
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

  // 1. Write to L1 local memory cache
  l1Set(cacheKey, { data, expiresAt: expiresAtTime });

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