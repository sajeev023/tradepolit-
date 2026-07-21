import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createMockSupabaseClient } from "./mock";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isMock = !url || !key || url.includes("mockproject.supabase.co");

  if (isMock) {
    return createMockSupabaseClient() as any;
  }

  const cookieStore = await cookies();

  if (cookieStore.get("sb-mock-session")?.value === "true") {
    const email = cookieStore.get("sb-mock-email")?.value
      ? decodeURIComponent(cookieStore.get("sb-mock-email")!.value)
      : "trader@tradepilot.app";
    return createMockSupabaseClient(email) as any;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}
