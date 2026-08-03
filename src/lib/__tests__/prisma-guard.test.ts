import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("prisma production mock-DB guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("module loads in production with a mock DB (build scenario) without throwing", async () => {
    // `next build` evaluates route modules in production mode without a runtime
    // DATABASE_URL. The guard must NOT throw at import time, or the build breaks.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    const mod = await import("@/lib/prisma");
    expect(mod.prisma).toBeDefined();
  });

  it("throws on first DB access in production when DATABASE_URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    const mod = await import("@/lib/prisma");
    expect(() => void (mod.prisma as any).user).toThrow(/mock database/i);
  });

  it("throws on first DB access in production when DATABASE_URL points to localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://postgres:test@localhost:5432/db");
    const mod = await import("@/lib/prisma");
    expect(() => void (mod.prisma as any).trade).toThrow(/mock database/i);
  });

  it("throws on first DB access in production when DATABASE_URL contains mockproject", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@db.mockproject.supabase.co:5432/postgres");
    const mod = await import("@/lib/prisma");
    expect(() => void (mod.prisma as any).alert).toThrow(/mock database/i);
  });

  it("uses the in-memory mock in non-production with a localhost DATABASE_URL", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://postgres:test@localhost:5432/db");
    const mod = await import("@/lib/prisma");
    // Mock client is a real object whose properties are functions, not a guard.
    expect(typeof (mod.prisma as any).user).toBe("object");
  });

  it("does not throw in production with a real remote DATABASE_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://postgres:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    );
    // Construction is lazy (no connection at import); the guard must not fire.
    const mod = await import("@/lib/prisma");
    expect(mod.prisma).toBeDefined();
  });
});