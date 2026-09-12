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

/**
 * Validate that a real PostgreSQL DATABASE_URL is present and well-formed.
 *
 * This runs on the real-client path only — i.e. when the application has actually
 * started and committed to opening a database connection (not at module import).
 * A missing or malformed URL fails LOUD and EARLY here, rather than surfacing as
 * an opaque connection error on the first query. This is the application-runtime
 * counterpart to Prisma's own connection-time enforcement of DIRECT_URL.
 *
 * The in-memory mock path (see `isMockDb` below) is untouched: when USE_DB_MOCK is
 * set or no DATABASE_URL is configured, the app boots on the mock without ever
 * calling this. So CI / `next build` / `prisma generate` never need the secret,
 * but a production process that expects a real DB still refuses to start misconfigured.
 */
export function assertDbConfig(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL env var is required when USE_DB_MOCK is not set. " +
      "Set it in your environment, or opt into the in-memory mock with USE_DB_MOCK=true."
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `DATABASE_URL is not a valid URL: "${url}". Expected a postgresql:// connection string.`
    );
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `DATABASE_URL must use the postgresql:// protocol, got "${parsed.protocol}".`
    );
  }
  return url;
}

function createPrismaClient() {
  const connectionString = assertDbConfig();
  const meta = parseDbUrl(connectionString);
  console.log(`[PRISMA RUNTIME] DATABASE_URL loaded | exists=${meta.exists}`);

  const isLocal =
    connectionString?.includes("localhost") ||
    connectionString?.includes("127.0.0.1");

  // TLS verification for remote databases.
  // Managed PostgreSQL providers (Supabase connection pooler, Neon, AWS RDS)
  // use internal CA certificates that fail Node.js's default root bundle with P1011
  // ("self-signed certificate in certificate chain"). Default to rejectUnauthorized: false
  // unless DB_STRICT_TLS is explicitly set to "true".
  const strictTls = process.env.DB_STRICT_TLS === "true";
  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: strictTls },
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

// Mock-DB resolution:
//  - USE_DB_MOCK=true → explicit opt-in (tests, local).
//  - No DATABASE_URL during `next build` (NEXT_PHASE=phase-production-build)
//    or outside production → lenient fallback so CI/builds never need
//    the secret (see assertDbConfig docstring).
//  - No DATABASE_URL at PRODUCTION RUNTIME → FAIL FAST with a loud error.
//    Previously this silently ran the app on an in-memory mock: user
//    actions (signups, trades, theses) were accepted and then evaporated
//    on instance recycle. A prod deployment without a DB is a
//    misconfiguration that must surface, not silently lose data.
const dbUrlMissing = !process.env.DATABASE_URL;
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.CI === "true" ||
  (process.env.VERCEL === "1" && dbUrlMissing);
const isProdRuntime = process.env.NODE_ENV === "production" && !isBuildPhase;

if (dbUrlMissing && isProdRuntime) {
  throw new Error(
    "[PRISMA RUNTIME] FATAL: DATABASE_URL is missing in production runtime. " +
    "Refusing to start on the in-memory mock DB (user data would be silently lost). " +
    "Set DATABASE_URL, or USE_DB_MOCK=true only for non-production."
  );
}

export const isMockDb = process.env.USE_DB_MOCK === "true" || dbUrlMissing;

if (process.env.USE_DB_MOCK === "true") {
  console.log(`[PRISMA RUNTIME] Using in-memory database mock (USE_DB_MOCK=true)`);
} else if (!process.env.DATABASE_URL) {
  console.warn(
    `[PRISMA RUNTIME] Warning: DATABASE_URL is missing. Falling back to in-memory mock.`
  );
} else {
  console.log(`[PRISMA RUNTIME] PostgreSQL active`);
}

export const prisma = isMockDb
  ? (prismaMock as any)
  : (globalForPrisma.prisma ?? createPrismaClient());

if (!isMockDb) {
  globalForPrisma.prisma = prisma;
}
