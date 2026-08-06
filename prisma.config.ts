import path from "node:path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, ".env") });

// DIRECT_URL is read here but NOT validated at import time. This file is loaded by
// the Prisma CLI on every invocation, including `prisma generate`, which only reads
// the schema and never opens a database connection. Throwing here would force
// production secrets to be present during `npm ci` / `next build`, which CI
// deliberately does not inject.
//
// Validation is deferred to connection time, where it actually matters:
//   - `prisma generate` needs no URL (schema-only) -> works without secrets.
//   - `prisma migrate` / `db push` / `validate` / `studio` need a live connection
//     -> Prisma enforces `datasource.url` natively and fails clearly if it is
//     missing ("The datasource.url property is required in your Prisma config...").
//   - The application runtime validates DATABASE_URL separately in
//     src/lib/prisma.ts when it creates a real (non-mock) PrismaClient.
//
// No hardcoded fallback URL is ever supplied, so there is no "connect to a default
// database" landmine (preserves the M-5 fix).
export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
