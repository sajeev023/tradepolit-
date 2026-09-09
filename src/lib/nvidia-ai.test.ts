import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGroqKeys,
  isGroqKeyUsable,
  markGroqKeyFailure,
  markGroqKeySuccess,
  getGroqKeyHealth,
  MODELS,
} from "./nvidia-ai";

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "gsk_aaaaaaaaaaaaaaaaaaaaaa");
  vi.stubEnv("GROQ_API_KEY_2", "gsk_bbbbbbbbbbbbbbbbbbbbbb");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Groq multi-key resolver", () => {
  it("returns both keys when both env vars are set", () => {
    const keys = getGroqKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0].index).toBe(0);
    expect(keys[1].index).toBe(1);
  });

  it("returns only the first key when GROQ_API_KEY_2 is empty", () => {
    vi.stubEnv("GROQ_API_KEY_2", "");
    const keys = getGroqKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].index).toBe(0);
  });

  it("treats mock-key and placeholder-key as missing", () => {
    vi.stubEnv("GROQ_API_KEY", "mock-key");
    vi.stubEnv("GROQ_API_KEY_2", "placeholder-key");
    expect(getGroqKeys()).toHaveLength(0);
  });

  it("strips surrounding quotes from the key", () => {
    vi.stubEnv("GROQ_API_KEY", '"gsk_abc"');
    const keys = getGroqKeys();
    expect(keys[0].key).toBe("gsk_abc");
  });
});

describe("Groq per-key health + cooldown", () => {
  it("marks a key as rate_limited and skips it during cooldown", () => {
    markGroqKeyFailure(0, 429, "Too Many Requests");
    expect(isGroqKeyUsable(0)).toBe(false);
    expect(getGroqKeyHealth().key1.status).toBe("rate_limited");
    // Other key still usable
    expect(isGroqKeyUsable(1)).toBe(true);
  });

  it("marks a key as auth_failed on 401", () => {
    markGroqKeyFailure(0, 401, "Unauthorized");
    expect(getGroqKeyHealth().key1.status).toBe("auth_failed");
    expect(isGroqKeyUsable(0)).toBe(false);
  });

  it("resets the key to online on success", () => {
    markGroqKeyFailure(0, 429, "fail");
    markGroqKeySuccess(0);
    expect(getGroqKeyHealth().key1.status).toBe("online");
    expect(getGroqKeyHealth().key1.cooldownUntil).toBe(0);
    expect(isGroqKeyUsable(0)).toBe(true);
  });

  it("registers three Groq slots in MODELS (key 1 70B, key 1 8B, key 2 70B)", () => {
    const groqModels = MODELS.filter(m => m.provider === "groq");
    expect(groqModels).toHaveLength(3);
    expect(groqModels.map(m => m.groqKeyIndex).sort()).toEqual([0, 0, 1]);
  });
});
