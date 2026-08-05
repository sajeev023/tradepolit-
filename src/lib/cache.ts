import { prisma } from "@/lib/prisma";

// L1 Local Process Cache for 0ms retrieval and DB load mitigation
const localCache = new Map<string, { data: any; expiresAt: number }>();

export async function getCachedData<T>(cacheKey: string): Promise<T | null> {
  // 1. Try L1 memory cache first (0ms latency, zero DB connections)
  const localItem = localCache.get(cacheKey);
  if (localItem) {
    if (Date.now() < localItem.expiresAt) {
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

  // 1. Write to L1 local memory cache
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
