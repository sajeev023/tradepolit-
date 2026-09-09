import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSession,
  encodeDemoCookie,
  DEMO_COOKIE_NAME,
  demoCookieOptions,
} from "@/lib/demo-session";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { rateLimitedError } from "@/lib/typed-errors";

/**
 * POST /api/demo/start
 *
 * Issues a fresh, server-signed demo session cookie. Each call creates a
 * new isolated demo user (random UUID) so demo visitors never share an
 * account. The cookie is HMAC-signed and httpOnly — not forgeable by the
 * client.
 *
 * Rate limited per-IP: 10 sessions / minute. Demo sessions are cheap to
 * mint but each one can spawn real User/UserProfile rows on first use, so
 * an unbounded minting loop is a storage-exhaustion vector.
 */
export async function POST(request: NextRequest) {
  const rl = checkIpRateLimit(request, "demo-start", 10, 60_000);
  if (!rl.allowed) {
    return rateLimitedError(
      rl.resetAt - Date.now(),
      "Too many demo sessions. Please wait a moment."
    );
  }

  const session = createDemoSession();
  const cookieValue = await encodeDemoCookie(session);

  const response = NextResponse.json({
    ok: true,
    demoUserId: session.id,
  });
  response.cookies.set(DEMO_COOKIE_NAME, cookieValue, demoCookieOptions);
  return response;
}
