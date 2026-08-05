import { NextResponse } from "next/server";
import {
  createDemoSession,
  encodeDemoCookie,
  DEMO_COOKIE_NAME,
  demoCookieOptions,
} from "@/lib/demo-session";

/**
 * POST /api/demo/start
 *
 * Issues a fresh, server-signed demo session cookie. Each call creates a
 * new isolated demo user (random UUID) so demo visitors never share an
 * account. The cookie is HMAC-signed and httpOnly — not forgeable by the
 * client.
 */
export async function POST() {
  const session = createDemoSession();
  const cookieValue = encodeDemoCookie(session);

  const response = NextResponse.json({
    ok: true,
    demoUserId: session.id,
  });
  response.cookies.set(DEMO_COOKIE_NAME, cookieValue, demoCookieOptions);
  return response;
}
