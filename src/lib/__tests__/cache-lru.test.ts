import { describe, it, expect, vi, beforeEach } from "vitest";

// Tests that the L1 in-process cache is bounded with approximate LRU
// eviction. The previous implementation used an unbounded Map (a slow
// memory leak across warm requests); this verifies the bound holds and the
// least-recently-used entry is the one evicted.
describe("L1 cache LRU bound", () => {
  let setCachedData: (k: string, d: any, ttl: number) => Promise<void>;
  let getCachedData: (k: string) => Promise<any>;
  let MAX: number;
  let findUniqueSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Fresh module graph → fresh module-level localCache Map AND a fresh
    // prismaMock memoryDb (empty L2). Both reset per test.
    vi.resetModules();
    const cache = await import("@/lib/cache");
    const prismaMod = await import("@/lib/prisma");
    setCachedData = cache.setCachedData;
    getCachedData = cache.getCachedData;
    MAX = cache.MAX_L1_ENTRIES;
    findUniqueSpy = vi.spyOn(prismaMod.prisma.marketCache, "findUnique");
  });

  it("bounds L1 to MAX_L1_ENTRIES (oldest key evicted from L1)", async () => {
    for (let i = 0; i < MAX + 5; i++) {
      await setCachedData(`key-${i}`, { n: i }, 60);
    }
    // Inserting MAX+5 distinct keys must not grow L1 past MAX. The oldest
    // key (key-0) was evicted from L1, so a read forces an L2 lookup
    // (findUnique). A cache that never evicted would still serve key-0 from
    // L1 with no L2 hit.
    findUniqueSpy.mockClear();
    const evicted = await getCachedData("key-0");
    expect(evicted).toEqual({ n: 0 }); // still correct — served from L2
    expect(findUniqueSpy).toHaveBeenCalledTimes(1); // proof it was NOT in L1
  });

  it("keeps the most-recently-inserted key in L1 (no L2 hit)", async () => {
    for (let i = 0; i < MAX + 5; i++) {
      await setCachedData(`key-${i}`, { n: i }, 60);
    }
    findUniqueSpy.mockClear();
    const recent = await getCachedData(`key-${MAX + 4}`);
    expect(recent).toEqual({ n: MAX + 4 });
    expect(findUniqueSpy).not.toHaveBeenCalled(); // served from L1
  });

  it("promotes a key to most-recently-used on read (touch)", async () => {
    // Fill exactly to capacity.
    for (let i = 0; i < MAX; i++) {
      await setCachedData(`key-${i}`, { n: i }, 60);
    }
    // Read key-0 — this moves it to the MRU tail so it is NOT the entry
    // evicted by the next insert.
    await getCachedData("key-0");

    // Insert one more key (triggers a single eviction of the LRU head,
    // which is now key-1, not key-0).
    await setCachedData(`key-${MAX}`, { n: MAX }, 60);

    findUniqueSpy.mockClear();
    const touched = await getCachedData("key-0");
    expect(touched).toEqual({ n: 0 });
    expect(findUniqueSpy).not.toHaveBeenCalled(); // key-0 survived in L1
  });
});