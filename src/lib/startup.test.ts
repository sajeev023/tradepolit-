import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStartupReport, logStartupBanner, redactKey, envNameForProvider } from "./startup";

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "gsk_aaaaaaaaaaaaaaaaaaaaaa");
  vi.stubEnv("GROQ_API_KEY_2", "");
  vi.stubEnv("NVIDIA_API_KEY", "nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxx");
  vi.stubEnv("GEMINI_API_KEY", "AQ.Ab8RN6KzV3ulhGy8thb_8");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("TWELVEDATA_API_KEY", "abcdef0123456789abcdef0123456789");
  vi.stubEnv("FINNHUB_API_KEY", "d9ganopr01qubrlg18n0");
  vi.stubEnv("NEWS_API_KEY", "abcdef0123456789abcdef01234567");
  vi.stubEnv("NEWSAPI_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getStartupReport", () => {
  it("reports 6 of 8 keys loaded with the test fixture", () => {
    const report = getStartupReport();
    expect(report.totalKeys).toBe(8);
    expect(report.loaded.length).toBe(6);
    expect(report.missing.map(c => c.label)).toEqual(
      expect.arrayContaining(["Groq Key #2", "OpenAI"])
    );
  });

  it("redacts key values: only prefix (6 chars) and length are exposed", () => {
    const report = getStartupReport();
    for (const c of report.loaded) {
      expect(c.prefix.length).toBeLessThanOrEqual(6);
      expect(c.prefix).not.toContain("aaaa");
      expect(c.prefix).not.toContain("xxxx");
    }
  });

  it("treats mock-key and placeholder-key as missing", () => {
    vi.stubEnv("TWELVEDATA_API_KEY", "mock-key");
    vi.stubEnv("NEWS_API_KEY", "placeholder-key");
    const report = getStartupReport();
    expect(report.missing.find(c => c.label === "TwelveData")).toBeTruthy();
    expect(report.missing.find(c => c.label === "NewsAPI")).toBeTruthy();
  });

  it("accepts NEWSAPI_API_KEY as alias for NEWS_API_KEY", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEWSAPI_API_KEY", "alias-key-value");
    const report = getStartupReport();
    expect(report.loaded.find(c => c.label === "NewsAPI")).toBeTruthy();
  });

  it("logStartupBanner runs without throwing and returns a report", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const report = logStartupBanner();
    expect(report.totalKeys).toBe(8);
    expect(logSpy).toHaveBeenCalled();
    const out = logSpy.mock.calls.map(c => String(c[0])).join("\n");
    expect(out).toContain("[STARTUP] TradePilot provider configuration");
    expect(out).toContain("Groq Key #1");
    expect(out).toContain("Loaded");
    logSpy.mockRestore();
  });
});

describe("redactKey", () => {
  it("returns first-6 + last-4 for long keys", () => {
    expect(redactKey("gsk_aaaaaaaaaaaaaaabbbb")).toBe("gsk_aa...bbbb");
  });

  it("never exposes the middle of the key", () => {
    const full = "gsk_REALSECRETMIDDLEEND1234";
    const out = redactKey(full);
    expect(out).not.toContain("REALSECRETMIDDLE");
    expect(out).not.toContain("REAL");
    expect(out).toContain("gsk_R");
    expect(out).toContain("1234");
  });

  it("returns 'absent' for empty / undefined input", () => {
    expect(redactKey(undefined)).toBe("absent");
    expect(redactKey("")).toBe("absent");
  });

  it("returns 'absent (placeholder)' for whitespace/mock/placeholder values", () => {
    expect(redactKey("   ")).toBe("absent (placeholder)");
    expect(redactKey("mock-key")).toBe("absent (placeholder)");
    expect(redactKey("placeholder-key")).toBe("absent (placeholder)");
  });

  it("returns 'short (length: N)' for keys ≤10 chars (too short to safely redact)", () => {
    expect(redactKey("abcd")).toBe("short (length: 4)");
    expect(redactKey("abcdefghij")).toBe("short (length: 10)");
  });

  it("strips surrounding whitespace before redacting", () => {
    expect(redactKey("  gsk_aaaaaaaaaaaaaaabbbb  ")).toBe("gsk_aa...bbbb");
  });
});

describe("envNameForProvider", () => {
  it("maps groq key index 0/1 to the correct env var", () => {
    expect(envNameForProvider("groq", 0)).toBe("GROQ_API_KEY");
    expect(envNameForProvider("groq", 1)).toBe("GROQ_API_KEY_2");
  });

  it("defaults to GROQ_API_KEY when no index is passed", () => {
    expect(envNameForProvider("groq")).toBe("GROQ_API_KEY");
  });

  it("maps other providers to their env vars", () => {
    expect(envNameForProvider("nvidia")).toBe("NVIDIA_API_KEY");
    expect(envNameForProvider("openai")).toBe("OPENAI_API_KEY");
    expect(envNameForProvider("gemini")).toBe("GEMINI_API_KEY");
  });
});
