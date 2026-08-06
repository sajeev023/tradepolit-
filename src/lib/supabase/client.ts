import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Fail fast rather than fall back to a placeholder anon key. See
  // lib/supabase/server.ts for the rationale.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient(url, key);
}
