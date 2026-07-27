import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/privacy",
  "/terms",
  "/refund",
  "/disclaimer",
  "/cookies",
  "/acceptable-use",
  "/pricing",
  "/news",
  "/market-pulse",
  "/risk-calculator",
];

const adminRoutes = ["/admin"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    // Fast path for public routes (e.g. Meta Ads landing page traffic):
    // If no Supabase session cookies exist, return response immediately without remote auth network call.
    const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
    if (!hasAuthCookie) {
      return NextResponse.next();
    }
    const { user, supabaseResponse } = await updateSession(request);
    if (user && ["/", "/login", "/signup"].includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/charts";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const { user, supabaseResponse } = await updateSession(request);

  if (isApiRoute(pathname)) {
    // CSRF hardening: reject cross-origin mutations. Same-origin POST/PATCH/DELETE
    // is allowed; same-site (subdomain) is allowed. Browsers without an Origin
    // header (older clients) fall back to Referer; if neither is present we
    // reject to be safe. GET/HEAD/OPTIONS are exempt.
    //
    // Outbound services (Stripe webhooks, Vercel Cron) POST to us with no
    // Origin/Referer header and must be exempted, otherwise billing webhooks
    // are 403'd before the handler ever runs. They carry their own
    // signature (Stripe-Signature) / bearer (CRON_SECRET) auth.
    const isMachineInbound =
      pathname === "/api/stripe/webhook" || pathname.startsWith("/api/cron/");
    const method = request.method.toUpperCase();
    if (!isMachineInbound && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");
      const allowedOriginRaw = origin ?? (referer ? new URL(referer).origin : null);
      // Exact-origin comparison. A naive `endsWith(host)` check is bypassable
      // by lookalike domains (e.g. https://evil-tradcopilot.com ends with
      // tradcopilot.com). Compare parsed origins instead.
      if (!allowedOriginRaw || !host) {
        return NextResponse.json(
          { error: { message: "Cross-origin requests are not allowed for this endpoint" } },
          { status: 403 }
        );
      }
      try {
        const allowedOrigin = new URL(allowedOriginRaw).origin;
        // Prefer x-forwarded-proto (set by Vercel/proxies to the client's
        // original scheme); fall back to the request's own protocol for
        // direct/local access.
        const proto =
          request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
          request.nextUrl.protocol.replace(":", "");
        const expectedOrigin = `${proto}://${host}`;
        if (allowedOrigin !== expectedOrigin) {
          return NextResponse.json(
            { error: { message: "Cross-origin requests are not allowed for this endpoint" } },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: { message: "Cross-origin requests are not allowed for this endpoint" } },
          { status: 403 }
        );
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute(pathname)) {
    const role = user.app_metadata?.role;
    if (role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
