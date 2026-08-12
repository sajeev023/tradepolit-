import { prisma } from "@/lib/prisma";

// L1 Local Process Cache for 0ms retrieval and DB load mitigation.
//
// Bounded so a long-lived instance can't grow this map without limit. Market
// cache keys are well-defined (price/ohlcv per symbol/timeframe) and the L2
// DB cache is the durable store; L1 is purely a hot-read accelerator, so
// evicting the oldest entry when full is always safe.
const localCache = new Map<string, { data: any; expiresAt: number }>();
const MAX_LOCAL_CACHE_KEYS = 1000;

// Insertion-order iteration: Map preserves insertion order, and we re-insert
// on read (see below), so the first key is always the least-recently-used.
// Evicting front entries is therefore a correct (if coarse) LRU.
function enforceLocalCacheCap(): void {
  while (localCache.size > MAX_LOCAL_CACHE_KEYS) {
    const oldestKey = localCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    localCache.delete(oldestKey);
  }
}

// Periodically drop expired entries so stale data doesn't linger even when a
// key is never read again. Called from getCachedData on a sampling basis.
let cacheOpsSinceSweep = 0;
function maybeSweepLocalCache(): void {
  if (++cacheOpsSinceSweep < 100) return;
  cacheOpsSinceSweep = 0;
  const now = Date.now();
  for (const [key, entry] of localCache) {
    if (now >= entry.expiresAt) localCache.delete(key);
  }
}

export async function getCachedData<T>(cacheKey: string): Promise<T | null> {
  // 1. Try L1 memory cache first (0ms latency, zero DB connections)
  maybeSweepLocalCache();
  const localItem = localCache.get(cacheKey);
  if (localItem) {
    if (Date.now() < localItem.expiresAt) {
      // Refresh recency for the LRU eviction policy: delete + re-insert moves
      // this key to the end of the iteration order.
      localCache.delete(cacheKey);
      localCache.set(cacheKey, localItem);
      return localItem.data as T;
    } else {
      localCache.delete(cacheKey);
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

  // 1. Write to L1 local memory cache (bounded — see enforceLocalCacheCap)
  localCache.set(cacheKey, { data, expiresAt: expiresAtTime });
  enforceLocalCacheCap();

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
