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

// The in-memory mock is ONLY active when explicitly opted in via
// USE_DB_MOCK=true. Auto-activating on a missing DATABASE_URL is a
// misconfiguration landmine (silent data-integrity loss in production),
// so we no longer do it.
const isMockDb = process.env.USE_DB_MOCK === "true";

if (isMockDb) {
  console.log(`[PRISMA RUNTIME] Using in-memory database mock (USE_DB_MOCK=true)`);
} else if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in your environment, or use USE_DB_MOCK=true for local dev without a database."
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
