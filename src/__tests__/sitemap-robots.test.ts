import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  getSiteUrl,
  getCanonicalSiteUrl,
  CANONICAL_SITE_URL,
  isLocalOrPreviewUrl,
} from "@/lib/site-url";

describe("SEO Site URL & Domain Sanitization", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("identifies local, loopback, internal, and vercel preview URLs", () => {
    expect(isLocalOrPreviewUrl("http://localhost:3000")).toBe(true);
    expect(isLocalOrPreviewUrl("http://localhost")).toBe(true);
    expect(isLocalOrPreviewUrl("https://localhost:8080")).toBe(true);
    expect(isLocalOrPreviewUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalOrPreviewUrl("http://0.0.0.0:3000")).toBe(true);
    expect(isLocalOrPreviewUrl("https://tradepolit-preview-abc.vercel.app")).toBe(true);
    expect(isLocalOrPreviewUrl("https://myapp.local")).toBe(true);
    expect(isLocalOrPreviewUrl("https://myapp.internal")).toBe(true);

    expect(isLocalOrPreviewUrl("https://tradcopilot.com")).toBe(false);
    expect(isLocalOrPreviewUrl("https://tradcopilot.com/pricing")).toBe(false);
  });

  it("guarantees https://tradcopilot.com in production even if NEXT_PUBLIC_APP_URL is localhost", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(getSiteUrl()).toBe("https://tradcopilot.com");
  });

  it("guarantees https://tradcopilot.com in production when VERCEL_ENV is production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview-123.vercel.app";

    expect(getSiteUrl()).toBe("https://tradcopilot.com");
  });

  it("guarantees https://tradcopilot.com in production if NEXT_PUBLIC_APP_URL is unset", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getSiteUrl()).toBe("https://tradcopilot.com");
  });

  it("accepts valid canonical domain in production and removes trailing slashes", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://tradcopilot.com///";

    expect(getSiteUrl()).toBe("https://tradcopilot.com");
  });

  it("allows localhost for local development", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("getCanonicalSiteUrl always returns https://tradcopilot.com", () => {
    expect(getCanonicalSiteUrl()).toBe(CANONICAL_SITE_URL);
    expect(CANONICAL_SITE_URL).toBe("https://tradcopilot.com");
  });
});

describe("Sitemap Generation (sitemap.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("generates production sitemap with ONLY https://tradcopilot.com canonical domain", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"; // simulates misconfigured env

    const entries = sitemap();

    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/tradcopilot\.com(\/.*)?$/);
      expect(entry.url).not.toContain("localhost");
      expect(entry.url).not.toContain("127.0.0.1");
      expect(entry.url).not.toContain("vercel.app");
      expect(entry.url.startsWith("http://")).toBe(false);
      expect(entry.priority).toBeGreaterThanOrEqual(0.0);
      expect(entry.priority).toBeLessThanOrEqual(1.0);
      expect(entry.lastModified).toBeDefined();
    }
  });

  it("includes all legitimate, publicly indexable routes and NO private/auth/dashboard routes", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    // Required public routes
    expect(urls).toContain("https://tradcopilot.com/");
    expect(urls).toContain("https://tradcopilot.com/features");
    expect(urls).toContain("https://tradcopilot.com/ai-trading-copilot");
    expect(urls).toContain("https://tradcopilot.com/ai-chart-analysis");
    expect(urls).toContain("https://tradcopilot.com/crypto-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/forex-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/trading-journal");
    expect(urls).toContain("https://tradcopilot.com/risk-management");
    expect(urls).toContain("https://tradcopilot.com/trading-alerts");
    expect(urls).toContain("https://tradcopilot.com/pricing");
    expect(urls).toContain("https://tradcopilot.com/faq");
    expect(urls).toContain("https://tradcopilot.com/about");
    expect(urls).toContain("https://tradcopilot.com/compare");
    expect(urls).toContain("https://tradcopilot.com/compare/tradcopilot-vs-tradingview");
    expect(urls).toContain("https://tradcopilot.com/compare/tradcopilot-vs-chatgpt");
    expect(urls).toContain("https://tradcopilot.com/guides");
    expect(urls).toContain("https://tradcopilot.com/guides/position-sizing-guide");
    expect(urls).toContain("https://tradcopilot.com/guides/technical-indicators");
    expect(urls).toContain("https://tradcopilot.com/guides/multi-timeframe-analysis");
    expect(urls).toContain("https://tradcopilot.com/guides/trading-discipline");
    expect(urls).toContain("https://tradcopilot.com/guides/support-and-resistance");
    expect(urls).toContain("https://tradcopilot.com/changelog");
    expect(urls).toContain("https://tradcopilot.com/terms");
    expect(urls).toContain("https://tradcopilot.com/privacy");
    expect(urls).toContain("https://tradcopilot.com/refund");
    expect(urls).toContain("https://tradcopilot.com/disclaimer");
    expect(urls).toContain("https://tradcopilot.com/cookies");
    expect(urls).toContain("https://tradcopilot.com/acceptable-use");

    // Strictly forbidden routes (auth, dashboard, API, internal)
    const forbiddenSubstrings = [
      "/dashboard",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/admin",
      "/charts",
      "/journal",
      "/watchlist",
      "/news",
      "/settings",
      "/ai-assistant",
      "/alerts",
      "/analytics",
      "/backtester",
      "/market-pulse",
      "/risk-calculator",
      "/api",
      "/auth",
    ];

    for (const url of urls) {
      const pathname = new URL(url).pathname;
      if (pathname === "" || pathname === "/") continue;
      for (const forbidden of forbiddenSubstrings) {
        expect(pathname).not.toBe(forbidden);
        expect(pathname.startsWith(`${forbidden}/`)).toBe(false);
      }
    }
  });

  it("contains zero localhost URLs in production output", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const entries = sitemap();
    const serialized = JSON.stringify(entries);

    expect(serialized).not.toContain("localhost:3000");
    expect(serialized).not.toContain("localhost");
    expect(serialized).not.toContain("127.0.0.1");
  });
});

describe("Robots.txt Generation (robots.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("references https://tradcopilot.com/sitemap.xml in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const config = robots();

    expect(config.sitemap).toBe("https://tradcopilot.com/sitemap.xml");
    expect(config.sitemap).not.toContain("localhost");
  });

  it("disallows protected dashboard and API paths with correct prefix semantics", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const config = robots();

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules).toBeDefined();

    const rawDisallow = rules?.disallow;
    const disallow: string[] = Array.isArray(rawDisallow)
      ? (rawDisallow.filter(Boolean) as string[])
      : rawDisallow
      ? [rawDisallow]
      : [];

    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/auth/");
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/dashboard");
    expect(disallow).toContain("/settings");
    expect(disallow).toContain("/charts");

    // Prefix patterns must NOT carry trailing slashes — "Disallow: /dashboard/"
    // does not match "/dashboard" itself under robots prefix matching.
    for (const entry of disallow) {
      if (entry !== "/api/" && entry !== "/auth/") {
        expect(entry.endsWith("/")).toBe(false);
      }
    }
  });

  it("keeps noindex-carrying pages crawlable (login/signup and anonymous tools are NOT robot-blocked)", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const config = robots();

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallow = Array.isArray(rules?.disallow)
      ? rules?.disallow
      : [rules?.disallow];

    // These pages emit <meta name="robots" content="noindex"> — blocking them
    // here would hide that directive from crawlers.
    for (const page of [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/news",
      "/market-pulse",
      "/risk-calculator",
    ]) {
      expect(disallow).not.toContain(page);
    }
  });
});
