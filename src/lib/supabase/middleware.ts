import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyDemoSessionFromRequest } from "@/lib/demo-session";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — important for Server Components.
  //
  // Demo session: verified from a server-issued HMAC-signed cookie. The demo
  // identity (id + email) is bound into the signed token, never read from a
  // client-set cookie, so a visitor cannot forge a PRO email here.
  let user = null;
  const demoSession = await verifyDemoSessionFromRequest(request);

  if (demoSession) {
    user = {
      id: demoSession.uid,
      email: demoSession.email,
      user_metadata: { full_name: "YC Demo Trader" },
      app_metadata: { role: "USER" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (error) {
      console.warn("Supabase auth middleware error:", error);
    }
  }

  return { user, supabaseResponse };
}
