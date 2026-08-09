import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Browser client. NEXT_PUBLIC_* vars are inlined at build time, so a
  // correctly built production bundle always has real values here. The
  // fallbacks below only guard against a misconfigured build (empty inlined
  // values) and are NOT a security boundary: the Supabase anon key is public
  // by design, and all auth/authorization is enforced server-side by
  // lib/supabase/middleware.ts and lib/supabase/server.ts (which fail fast on
  // a missing key). Throwing in the browser would white-screen the app with
  // no recovery path, so we degrade to the placeholder instead.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient(url, key);
}
