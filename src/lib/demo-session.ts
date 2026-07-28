/**
 * src/lib/demo-session.ts
 *
 * Server-issued, cryptographically-signed demo session for the YC "Instant
 * Demo" flow. Uses Web Crypto API (crypto.subtle) so it is 100% compatible
 * with both Node.js and Next.js Edge Runtime without Node module warnings.
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const DEMO_SESSION_COOKIE = "demo-session";
const MAX_AGE_SECONDS = 60 * 60; // 1h

export const DEMO_USER_ID = "partner-1234-1234-1234-123456789012";
export const DEMO_USER_EMAIL = "partner@tradcopilot.com";

interface DemoPayload {
  uid: string;
  email: string;
  iat: number;
  exp: number;
}

function getSigningKey(): string {
  const key =
    process.env.DEMO_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.DATABASE_URL;
  if (!key) {
    throw new Error(
      "Demo session signing key unavailable — set DEMO_SESSION_SECRET, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL."
    );
  }
  return key;
}

async function signHmacSha256(keyStr: string, dataStr: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyStr);
  const data = encoder.encode(dataStr);

  const cryptoObj = globalThis.crypto;
  const key = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await cryptoObj.subtle.sign("HMAC", key, data);
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface VerifiedDemoSession {
  uid: string;
  email: string;
  exp: number;
}

export async function signDemoToken(payload: DemoPayload): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = btoa(payloadJson).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = await signHmacSha256(getSigningKey(), payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyDemoToken(token: string | undefined | null): Promise<VerifiedDemoSession | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  let expectedSig: string;
  try {
    expectedSig = await signHmacSha256(getSigningKey(), payloadB64);
  } catch {
    return null;
  }
  if (!constantTimeEqual(sig, expectedSig)) return null;
  try {
    const rawJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(rawJson) as DemoPayload;
    if (payload.uid !== DEMO_USER_ID || payload.email !== DEMO_USER_EMAIL) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function issueDemoSession(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await signDemoToken({
    uid: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
  });
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function verifyDemoSession(): Promise<VerifiedDemoSession | null> {
  try {
    const store = await cookies();
    return await verifyDemoToken(store.get(DEMO_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function verifyDemoSessionFromRequest(request: NextRequest): Promise<VerifiedDemoSession | null> {
  return await verifyDemoToken(request.cookies.get(DEMO_SESSION_COOKIE)?.value);
}