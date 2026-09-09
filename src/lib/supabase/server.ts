import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // Fail fast rather than fall back to a placeholder anon key. A missing key
  // means the operator has not configured Supabase — silently booting with a
  // known public placeholder JWT would let any unauthenticated caller read/write
  // Supabase data in environments where the placeholder secret was ever used.
  // Supabase anon keys are non-secret by design, but a misconfigured project
  // could be initialized with exactly this placeholder.
  //
  // This mirrors the fail-fast in lib/supabase/middleware.ts so every
  // server-side entry point behaves consistently. It runs at request time
  // (createClient is only called from route handlers / Server Components), so
  // `next build` / `prisma generate` — which never open a request — are
  // unaffected. CI and Vercel inject real values; a misconfigured production
  // process fails loudly here instead of silently using a placeholder.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  const cookieStore = await cookies();

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
