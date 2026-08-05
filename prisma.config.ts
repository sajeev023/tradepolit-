import path from "node:path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, ".env") });

// No fallback URL. A hardcoded postgres:postgres default credential is a
// misconfiguration landmine (M-5 fix). Require DIRECT_URL to be set.
const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error("DIRECT_URL env var is required. Set it in your environment.");
}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: directUrl,
  },
});
