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
];

const adminRoutes = ["/admin"];

const DEMO_EMAILS = ["partner@tradepilot.ai", "trader@tradepilot.app"];
const DEMO_SESSION_MINUTES = 15;

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

function isDemoUser(email?: string): boolean {
  return email ? DEMO_EMAILS.includes(email) : false;
}

function getDemoSessionStart(request: NextRequest): number | null {
  const cookie = request.cookies.get("demo-session-start");
  if (cookie?.value) {
    return parseInt(cookie.value, 10);
  }
  return null;
}

function setDemoSessionStart(response: NextResponse): void {
  response.cookies.set("demo-session-start", Date.now().toString(), {
    path: "/",
    maxAge: DEMO_SESSION_MINUTES * 60,
    sameSite: "lax",
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const { user, supabaseResponse } = await updateSession(request);

  // Check demo session expiry for protected routes
  if (user && isDemoUser(user.email)) {
    const sessionStart = getDemoSessionStart(request);
    const now = Date.now();
    
    if (!sessionStart) {
      // First request - set session start
      setDemoSessionStart(supabaseResponse);
    } else if (now - sessionStart > DEMO_SESSION_MINUTES * 60 * 1000) {
      // Session expired - clear cookies and redirect to signup
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      url.searchParams.set("expired", "demo");
      
      const response = NextResponse.redirect(url);
      response.cookies.delete("sb-mock-session");
      response.cookies.delete("sb-mock-email");
      response.cookies.delete("demo-session-start");
      return response;
    }
  }

  if (isPublicRoute(pathname)) {
    if (user && ["/", "/login", "/signup"].includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/charts";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (isApiRoute(pathname)) {
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
