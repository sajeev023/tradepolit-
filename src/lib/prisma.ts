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

  // Bounded pool config. On serverless (Vercel Fluid Compute) each warm
  // instance keeps its own pool; an unbounded default (10) exhausts Supabase
  // connections under many concurrent instances. Small max + short idle
  // timeout keeps connection counts predictable. PgBouncer (port 6543)
  // already multiplexes upstream, so a small client pool is ideal there.
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
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

// In production, a missing/placeholder DATABASE_URL is a misconfiguration that
// would silently fall back to the in-memory mock (losing all writes on
// instance recycle). Fail fast instead of degrading to a non-persistent store.
if (process.env.NODE_ENV === "production" && isLocalhostDb) {
  throw new Error(
    "[PRISMA RUNTIME] Production is misconfigured: DATABASE_URL is missing or points to localhost/mockproject. Refusing to start on a non-persistent mock database."
  );
}

if (isLocalhostDb) {
  console.log(`[PRISMA RUNTIME] Using fallback in-memory database mock (isLocalhostDb=true)`);
} else {
  console.log(`[PRISMA RUNTIME] Supabase PostgreSQL active`);
}

// Keep the real PrismaClient typing at every call site. The mock is only used
// in local/test (isLocalhostDb); casting it to PrismaClient here means `tsc`
// validates all queries against the real schema even when the mock branch is
// active — so a query selecting a nonexistent field fails the build instead of
// 500-ing in production.
export const prisma: PrismaClient = isLocalhostDb
  ? (prismaMock as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? createPrismaClient());

// Cache the client globally in ALL environments (including production) so warm
// serverless invocations reuse the existing PrismaClient + pg.Pool instead of
// constructing a new pool on every cold start.
if (!isLocalhostDb && !globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}