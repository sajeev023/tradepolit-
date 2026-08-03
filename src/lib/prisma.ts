import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { prismaMock } from "./prisma-mock";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function parseDbUrl(url?: string) {
  if (!url) return { exists: false, host: "NONE", port: "NONE" };
  try {
    const parsed = new URL(url);
    return { exists: true, host: parsed.hostname, port: parsed.port || "5432" };
  } catch {
    return { exists: true, host: "unparseable", port: "unparseable" };
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const meta = parseDbUrl(connectionString);
  console.log(`[PRISMA RUNTIME] DATABASE_URL loaded | exists=${meta.exists}`);

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const isLocalhostDb =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("localhost") ||
  process.env.DATABASE_URL.includes("mockproject");

if (isLocalhostDb) {
  console.log(`[PRISMA RUNTIME] Using fallback in-memory database mock (isLocalhostDb=true)`);
} else {
  console.log(`[PRISMA RUNTIME] Supabase PostgreSQL active`);
}

// Production must never serve users from the in-memory mock database — a missing
// or localhost/mockproject DATABASE_URL would otherwise boot silently, serve
// fabricated demo data, and lose every write on cold start.
//
// We cannot throw at module load because `next build` evaluates route modules in
// production mode without a runtime DATABASE_URL (the build does not serve users
// and may legitimately lack DB access). Instead, in production-with-mock we
// export a Proxy that throws on the first DB operation. All prisma access in
// this codebase happens inside route handlers / exported functions (never at
// module top level), so:
//   - `next build` succeeds (handlers are not invoked during build).
//   - A misconfigured production runtime fails loudly on the first request that
//     touches the database, instead of silently serving mock data.
function productionMockGuard(): any {
  const fail = (): never => {
    throw new Error(
      "FATAL: Production cannot run on a mock database. DATABASE_URL is missing or points to localhost/mockproject. Set a real PostgreSQL DATABASE_URL environment variable."
    );
  };
  return new Proxy(
    {},
    {
      get: () => fail(),
      has: () => true,
    }
  );
}

// NOTE: the mock / guard branches are intentionally typed `any` (matching the
// prior `prismaMock as any`), so the exported `prisma` keeps its original
// effective type. Widening it to `PrismaClient` would surface unrelated latent
// type errors across callers (e.g. analyze-chart) that are out of scope for
// this hardening pass.
export const prisma = isLocalhostDb
  ? process.env.NODE_ENV === "production"
    ? productionMockGuard()
    : (prismaMock as any)
  : (globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production" && !isLocalhostDb) {
  globalForPrisma.prisma = prisma;
}