import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertDbConfig } from "./prisma";

const VALID_URL = "postgresql://postgres:postgres@localhost:5432/postgres";

beforeEach(() => {
  // These tests exercise assertDbConfig() in isolation (a pure function of
  // process.env), so force the mock off and clear DATABASE_URL unless a test
  // sets it explicitly.
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  delete process.env.DATABASE_URL;
});

describe("assertDbConfig (lazy runtime DB validation)", () => {
  it("returns the URL when DATABASE_URL is a valid postgresql:// string", () => {
    process.env.DATABASE_URL = VALID_URL;
    expect(assertDbConfig()).toBe(VALID_URL);
  });

  it("accepts the legacy postgres:// protocol too", () => {
    process.env.DATABASE_URL = "postgres://user:pass@host:5432/db";
    expect(assertDbConfig()).toBe("postgres://user:pass@host:5432/db");
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => assertDbConfig()).toThrow(/DATABASE_URL env var is required/);
  });

  it("throws when DATABASE_URL is an empty string", () => {
    process.env.DATABASE_URL = "";
    expect(() => assertDbConfig()).toThrow(/DATABASE_URL env var is required/);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    process.env.DATABASE_URL = "not-a-url";
    expect(() => assertDbConfig()).toThrow(/not a valid URL/);
  });

  it("throws when DATABASE_URL uses a non-postgres protocol", () => {
    process.env.DATABASE_URL = "mysql://user:pass@host:3306/db";
    expect(() => assertDbConfig()).toThrow(/must use the postgresql:\/\//);
  });
});
