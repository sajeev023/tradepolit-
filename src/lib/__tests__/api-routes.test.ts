import { describe, it, expect } from "vitest";
import { secureBearerMatch } from "../secure-compare";
import { signDemoToken, verifyDemoToken, DEMO_USER_ID, DEMO_USER_EMAIL } from "../demo-session";
import { resolvePlan } from "../entitlements";

describe("API & Security Integration Tests", () => {
  describe("1. Timing-Safe Secret Verification (secureBearerMatch)", () => {
    it("returns true for matching secret header strings", () => {
      const header = "Bearer my-secret-token-123";
      const expected = "my-secret-token-123";
      expect(secureBearerMatch(header, expected)).toBe(true);
    });

    it("returns false for mismatched secrets of equal or unequal length", () => {
      expect(secureBearerMatch("Bearer wrong-token", "my-secret-token-123")).toBe(false);
      expect(secureBearerMatch("Bearer short", "my-secret-token-123")).toBe(false);
      expect(secureBearerMatch(null, "my-secret-token-123")).toBe(false);
      expect(secureBearerMatch("", "my-secret-token-123")).toBe(false);
    });
  });

  describe("2. Demo Session HMAC Signing & Verification", () => {
    it("verifies a valid signed demo session token", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await signDemoToken({
        uid: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        iat: now,
        exp: now + 3600,
      });
      const payload = await verifyDemoToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.email).toBe(DEMO_USER_EMAIL);
      expect(payload?.uid).toBe(DEMO_USER_ID);
    });

    it("rejects tampered or invalid demo session tokens", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await signDemoToken({
        uid: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        iat: now,
        exp: now + 3600,
      });
      const tampered = token.slice(0, -5) + "abcde";
      const payload = await verifyDemoToken(tampered);
      expect(payload).toBeNull();
    });

    it("rejects null or empty token inputs", async () => {
      expect(await verifyDemoToken(null)).toBeNull();
      expect(await verifyDemoToken("")).toBeNull();
    });
  });

  describe("3. Entitlement Expiry Guard (resolvePlan)", () => {
    it("downgrades expired subscriptions to FREE tier", () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
      const plan = resolvePlan("user-1", "user@test.com", "PRO", "ACTIVE", pastDate);
      expect(plan).toBe("FREE");
    });

    it("preserves ACTIVE status for unexpired subscriptions", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
      const plan = resolvePlan("user-1", "user@test.com", "PRO", "ACTIVE", futureDate);
      expect(plan).toBe("PRO");
    });

    it("handles null expiry date safely based on raw status", () => {
      expect(resolvePlan("user-1", "user@test.com", "PRO", "ACTIVE", null)).toBe("PRO");
      expect(resolvePlan("user-1", "user@test.com", "FREE", "INACTIVE", null)).toBe("FREE");
    });
  });
});
