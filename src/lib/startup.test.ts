import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStartupReport, logStartupBanner } from "./startup";

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
