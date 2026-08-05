import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProviderHealth, getExtendedProviderHealth } from "./ai-providers";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("GROQ_API_KEY_2", "test-key-2");
  vi.stubEnv("NVIDIA_API_KEY", "test-key");
  vi.stubEnv("TWELVEDATA_API_KEY", "test-key");
  vi.stubEnv("FINNHUB_API_KEY", "test-key");
  vi.stubEnv("NEWS_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getProviderHealth", () => {
  it("returns status object with 3 providers", () => {
    const health = getProviderHealth();
    expect(health).toHaveProperty("gemini");
    expect(health).toHaveProperty("groq");
    expect(health).toHaveProperty("nvidia");
  });

  it("reports offline status when no API keys set", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY_2", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    const health = getProviderHealth();
    expect(health.gemini.status).toBe("offline");
    expect(health.groq.status).toBe("offline");
    expect(health.nvidia.status).toBe("offline");
  });

  it("reports online when valid keys present", () => {
    const health = getProviderHealth();
    expect(health.gemini.status).toBe("online");
    expect(health.groq.status).toBe("online");
    expect(health.nvidia.status).toBe("online");
  });

  it("detects premium keys", () => {
    vi.stubEnv("GEMINI_PREMIUM_API_KEY", "premium-key");
    vi.stubEnv("GROQ_PREMIUM_API_KEY", "");
    vi.stubEnv("NVIDIA_PREMIUM_API_KEY", "premium-key");
    const health = getProviderHealth();
    expect((health.gemini as any).hasPremiumKey).toBe(true);
    expect((health.groq as any).hasPremiumKey).toBe(false);
    expect((health.nvidia as any).hasPremiumKey).toBe(true);
  });
});

describe("getExtendedProviderHealth", () => {
  it("includes both groq keys and all data providers", () => {
    const health = getExtendedProviderHealth();
    expect(health.groq).toHaveProperty("key1");
    expect(health.groq).toHaveProperty("key2");
    expect(health.groq.key1.keyInfo.present).toBe(true);
    expect(health.groq.key2.keyInfo.present).toBe(true);
    expect(health.twelvedata.present).toBe(true);
    expect(health.finnhub.present).toBe(true);
    expect(health.newsapi.present).toBe(true);
  });

  it("reports groq key #2 missing when only key #1 is set", () => {
    vi.stubEnv("GROQ_API_KEY_2", "");
    const health = getExtendedProviderHealth();
    expect(health.groq.key1.keyInfo.present).toBe(true);
    expect(health.groq.key2.keyInfo.present).toBe(false);
  });

  it("marks data providers as missing when their keys are unset", () => {
    vi.stubEnv("TWELVEDATA_API_KEY", "");
    vi.stubEnv("FINNHUB_API_KEY", "");
    vi.stubEnv("NEWS_API_KEY", "");
    const health = getExtendedProviderHealth();
    expect(health.twelvedata.present).toBe(false);
    expect(health.finnhub.present).toBe(false);
    expect(health.newsapi.present).toBe(false);
  });

  it("only ever exposes a 6-char prefix and length — never the key value", () => {
    const health = getExtendedProviderHealth();
    const k1 = (health.groq.key1.keyInfo as any);
    const k2 = (health.groq.key2.keyInfo as any);
    expect(k1.prefix.length).toBeLessThanOrEqual(6);
    expect(k2.prefix.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(health)).not.toContain("test-key-2-full-value");
  });
});
