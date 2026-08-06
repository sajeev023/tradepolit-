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
