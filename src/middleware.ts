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
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");
      const allowedOrigin = origin ?? (referer ? new URL(referer).origin : null);
      if (!allowedOrigin || !host || !allowedOrigin.endsWith(host)) {
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
