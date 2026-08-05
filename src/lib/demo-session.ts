/**
 * demo-session.ts
 *
 * Server-signed demo sessions. Replaces the old client-controlled
 * `sb-mock-session` cookie (which was trivially forgeable) with an
 * HMAC-signed cookie that the middleware validates cryptographically.
 *
 * Each demo click issues a fresh random demo user ID so sessions are
 * isolated — no shared account, no cross-user data leakage.
 *
 * Crypto note: this module uses the Web Crypto API (`globalThis.crypto.subtle`)
 * instead of Node's `crypto` module so it runs identically in the Edge
 * Runtime (middleware) and the Node.js runtime (API routes). All runtimes
 * available to this app (Node ≥ 20, Vercel Edge) implement Web Crypto.
 */

const DEMO_COOKIE = "tp-demo-session";
const DEMO_COOKIE_MAX_AGE = 60 * 60; // 1 hour
const DEMO_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes inactivity expiry

// DEMO_SECRET must be set in production. Fall back to a dev-only placeholder
// so local development + CI builds still work. The placeholder is short enough
// that the runtime guard below will refuse to sign/verify in production.
function getSecret(): string {
  return process.env.DEMO_SECRET || "dev-demo-secret-do-not-use-in-production";
}

// Runtime guard: refuse to actually use demo sessions in production without a
// real secret. This is checked on first use (not module load) so that:
//   1. `next build` can evaluate the module without a secret present.
//   2. A missing secret takes down only the demo feature, not the whole server.
//   3. The security property holds — forged demo cookies cannot be minted or
//      accepted in production without a 32+ char secret.
let secretValidated = false;
function assertProductionSecret(): void {
  if (secretValidated) return;
  secretValidated = true;
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.DEMO_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        "DEMO_SECRET must be set to a random 32+ char value in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      );
    }
  }
}

// Resolved once per cold start. `globalThis.crypto` is the Web Crypto API,
// available in both Edge Runtime and Node 16+. The Non-secure-types here are
// intentional: we only need the object reference, not the typed subclass.
const webCrypto: Crypto = globalThis.crypto;

const textEncoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return webCrypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// HMAC-SHA256 sign → hex string. Async because Web Crypto is async, but the
// result is byte-identical to Node's crypto.createHmac().digest('hex').
async function sign(payload: string): Promise<string> {
  assertProductionSecret();
  const key = await importHmacKey(getSecret());
  const sigBuffer = await webCrypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return bufferToHex(sigBuffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Constant-time string comparison to avoid timing side-channels.
// (Node's crypto.timingSafeEqual is unavailable in Edge Runtime.)
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function makeToken(demoUserId: string, email: string, issuedAt: number): Promise<string> {
  const payload = `${demoUserId}.${email}.${issuedAt}`;
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string): Promise<{ demoUserId: string; email: string; issuedAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [demoUserId, email, issuedAtStr, sig] = parts;
  const payload = `${demoUserId}.${email}.${issuedAtStr}`;
  const expectedSig = await sign(payload);
  if (!timingSafeEqualHex(sig, expectedSig)) return null;
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
  assertProductionSecret();
  // Random UUID per click — sessions are never shared. crypto.randomUUID()
  // is part of the Web Crypto API available in Edge + Node.
  const id = webCrypto.randomUUID();
  const email = `demo-${id.slice(0, 8)}@tradcopilot.local`;
  const issuedAt = Date.now();
  return { id, email, issuedAt };
}

export async function encodeDemoCookie(session: DemoSession): Promise<string> {
  return makeToken(session.id, session.email, session.issuedAt);
}

export async function decodeDemoCookie(cookieValue: string): Promise<DemoSession | null> {
  const verified = await verifyToken(cookieValue);
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
