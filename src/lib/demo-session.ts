/**
 * demo-session.ts
 *
 * Server-signed demo sessions. Replaces the old client-controlled
 * `sb-mock-session` cookie (which was trivially forgeable) with an
 * HMAC-signed cookie that the middleware validates cryptographically.
 *
 * Each demo click issues a fresh random demo user ID so sessions are
 * isolated — no shared account, no cross-user data leakage.
 */

import crypto from "crypto";

const DEMO_COOKIE = "tp-demo-session";
const DEMO_COOKIE_MAX_AGE = 60 * 60; // 1 hour
const DEMO_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes inactivity expiry

function getSecret(): string {
  // DEMO_SECRET must be set in production. Fall back to a dev-only
  // placeholder so local development still works, but the dev placeholder
  // is short enough that the startup guard below will refuse prod.
  return process.env.DEMO_SECRET || "dev-demo-secret-do-not-use-in-production";
}

// Guard: refuse to boot in production without a real secret.
if (process.env.NODE_ENV === "production") {
  const secret = process.env.DEMO_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "DEMO_SECRET must be set to a random 32+ char value in production. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}

function sign(payload: string): string {
  const secret = getSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(demoUserId: string, email: string, issuedAt: number): string {
  const payload = `${demoUserId}.${email}.${issuedAt}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { demoUserId: string; email: string; issuedAt: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [demoUserId, email, issuedAtStr, sig] = parts;
  const payload = `${demoUserId}.${email}.${issuedAtStr}`;
  const expectedSig = sign(payload);
  // Constant-time comparison to avoid timing side-channel.
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return null;
  return { demoUserId, email, issuedAt };
}

export interface DemoSession {
  id: string;
  email: string;
  issuedAt: number;
}

export function createDemoSession(): DemoSession {
  // Random UUID per click — sessions are never shared.
  const id = crypto.randomUUID();
  const email = `demo-${id.slice(0, 8)}@tradcopilot.local`;
  const issuedAt = Date.now();
  return { id, email, issuedAt };
}

export function encodeDemoCookie(session: DemoSession): string {
  return makeToken(session.id, session.email, session.issuedAt);
}

export function decodeDemoCookie(cookieValue: string): DemoSession | null {
  const verified = verifyToken(cookieValue);
  if (!verified) return null;
  // Enforce inactivity TTL.
  if (Date.now() - verified.issuedAt > DEMO_SESSION_TTL_MS) return null;
  return {
    id: verified.demoUserId,
    email: verified.email,
    issuedAt: verified.issuedAt,
  };
}

export const DEMO_COOKIE_NAME = DEMO_COOKIE;
export const DEMO_COOKIE_MAX_AGE_SECONDS = DEMO_COOKIE_MAX_AGE;

export const demoCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
};
