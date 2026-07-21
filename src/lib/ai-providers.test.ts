import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProviderHealth } from "./ai-providers";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("NVIDIA_API_KEY", "test-key");
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
