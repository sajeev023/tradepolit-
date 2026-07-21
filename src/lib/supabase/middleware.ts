import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createMockSupabaseClient, getMockUser } from "./mock";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isMock = !url || !key || url.includes("mockproject.supabase.co");
  const hasMockSession = request.cookies.get("sb-mock-session")?.value === "true";

  if (isMock || hasMockSession) {
    const mockEmail = request.cookies.get("sb-mock-email")?.value
      ? decodeURIComponent(request.cookies.get("sb-mock-email")!.value)
      : "trader@tradepilot.app";
    const user = hasMockSession ? getMockUser(mockEmail) : null;
    return { user, supabaseResponse };
  }

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

  // Refresh session — important for Server Components
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.warn("Supabase auth middleware error:", error);
  }

  return { user, supabaseResponse };
}
