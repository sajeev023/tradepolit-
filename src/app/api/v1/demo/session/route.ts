import { NextResponse } from "next/server";
import { issueDemoSession } from "@/lib/demo-session";
import { dispatchCaughtError } from "@/lib/typed-errors";

/**
 * POST /api/v1/demo/session
 *
 * Issues a server-signed, HttpOnly demo-session cookie for the YC "Instant
 * Demo" flow. The client cannot forge or tamper with the demo identity (the
 * email is bound into the signed token, never client-supplied), closing the
 * previous privilege-escalation path where a visitor could set a PRO email in
 * a client cookie and gain PRO access.
 */
export async function POST() {
  try {
    await issueDemoSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to issue demo session:", err);
    return dispatchCaughtError("Demo sessions are temporarily unavailable.", err);
  }
}