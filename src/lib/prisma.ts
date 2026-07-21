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

export const prisma = isLocalhostDb
  ? (prismaMock as any)
  : (globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production" && !isLocalhostDb) {
  globalForPrisma.prisma = prisma;
}
