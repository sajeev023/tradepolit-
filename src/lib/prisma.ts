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

// The in-memory mock is active when explicitly opted in via USE_DB_MOCK=true,
// or automatically as a safe fallback if DATABASE_URL is missing (preventing build crashes).
const isMockDb = process.env.USE_DB_MOCK === "true" || !process.env.DATABASE_URL;

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
