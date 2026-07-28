import { describe, it, expect, beforeAll } from "vitest";
import {
  verifyDemoToken,
  signDemoToken,
  DEMO_USER_ID,
  DEMO_USER_EMAIL,
} from "./demo-session";

/**
 * Security regression tests for the signed demo session. The previous design
 * trusted a client-set email cookie; a visitor could set a PRO email and gain
 * PRO access. The signed token must (a) round-trip, (b) reject any tampering
 * of the payload (which is where an attacker would inject a PRO email), and
 * (c) reject expired tokens.
 */
describe("demo-session — signed token verification", () => {
  beforeAll(() => {
    // Provide a stable signing key for the test environment.
    process.env.DEMO_SESSION_SECRET = "test-secret-do-not-use-in-prod";
  });

  it("round-trips a freshly signed token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signDemoToken({
      uid: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      iat: now,
      exp: now + 3600,
    });
    const verified = await verifyDemoToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.uid).toBe(DEMO_USER_ID);
    expect(verified?.email).toBe(DEMO_USER_EMAIL);
  });

  it("rejects a token whose payload was tampered to a PRO email", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Sign a legitimate demo token, then tamper with the payload to inject a
    // PRO email — the signature must no longer validate.
    const token = await signDemoToken({
      uid: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      iat: now,
      exp: now + 3600,
    });
    const [payloadB64, sig] = token.split(".");
    const rawJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(rawJson);
    payload.email = "sajeevajay683@gmail.com"; // a PRO email from entitlements.ts
    const tamperedPayloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const tampered = `${tamperedPayloadB64}.${sig}`;
    expect(await verifyDemoToken(tampered)).toBeNull();
  });

  it("rejects a token with a forged signature", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payloadB64 = btoa(JSON.stringify({
      uid: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      iat: now,
      exp: now + 3600,
    })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const forged = `${payloadB64}.bm90LWEtcmVhbC1zaWduYXR1cmU`;
    expect(await verifyDemoToken(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signDemoToken({
      uid: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      iat: now - 7200,
      exp: now - 3600, // expired an hour ago
    });
    expect(await verifyDemoToken(token)).toBeNull();
  });

  it("rejects a token whose uid/email do not match the fixed demo identity", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Signed with the real key but for a non-demo identity — must still be
    // rejected because verifyDemoToken pins the demo identity.
    const token = await signDemoToken({
      uid: "some-other-user-id",
      email: "attacker@example.com",
      iat: now,
      exp: now + 3600,
    });
    expect(await verifyDemoToken(token)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifyDemoToken(null)).toBeNull();
    expect(await verifyDemoToken("")).toBeNull();
    expect(await verifyDemoToken("only-one-part")).toBeNull();
    expect(await verifyDemoToken("a.b.c")).toBeNull();
  });
});