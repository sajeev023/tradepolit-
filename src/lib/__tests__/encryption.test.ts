import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const DEFAULT_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const UNIQUE_KEY = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("encryption", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips encrypt -> decrypt", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENCRYPTION_KEY", UNIQUE_KEY);
    const { encrypt, decrypt } = await import("../encryption");
    const plain = "sk-test-byok-api-key-12345";
    const ciphertext = encrypt(plain);
    expect(ciphertext).not.toBe(plain);
    expect(ciphertext.split(":")).toHaveLength(3);
    expect(decrypt(ciphertext)).toBe(plain);
  });

  it("returns DECRYPTION_ERROR for tampered ciphertext", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { encrypt, decrypt } = await import("../encryption");
    const ciphertext = encrypt("hello");
    const tampered = ciphertext.slice(0, -4) + "0000";
    expect(decrypt(tampered)).toBe("DECRYPTION_ERROR");
  });

  it("returns DECRYPTION_ERROR for malformed input", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { decrypt } = await import("../encryption");
    expect(decrypt("not-encrypted")).toBe("DECRYPTION_ERROR");
    expect(decrypt("only:two:parts:four")).toBe("DECRYPTION_ERROR");
  });

  it("module loads in production without ENCRYPTION_KEY (build scenario) without throwing", async () => {
    // `next build` evaluates route modules in production mode without runtime
    // secrets. The guard must NOT fire at import time, or the build breaks.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "");
    const mod = await import("../encryption");
    expect(typeof mod.encrypt).toBe("function");
    expect(typeof mod.decrypt).toBe("function");
  });

  it("encrypt() throws in production when ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "");
    const { encrypt } = await import("../encryption");
    expect(() => encrypt("secret")).toThrow(/ENCRYPTION_KEY/);
  });

  it("encrypt() throws in production when ENCRYPTION_KEY is the public default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", DEFAULT_KEY);
    const { encrypt } = await import("../encryption");
    expect(() => encrypt("secret")).toThrow(/ENCRYPTION_KEY/);
  });

  it("decrypt() throws in production when ENCRYPTION_KEY is missing (not swallowed into DECRYPTION_ERROR)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", "");
    const { decrypt } = await import("../encryption");
    expect(() => decrypt("00:00:00")).toThrow(/ENCRYPTION_KEY/);
  });

  it("encrypt/decrypt work in production with a unique key set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENCRYPTION_KEY", UNIQUE_KEY);
    const { encrypt, decrypt } = await import("../encryption");
    expect(decrypt(encrypt("prod-secret"))).toBe("prod-secret");
  });
});