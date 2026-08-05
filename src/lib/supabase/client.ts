import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Fail fast rather than fall back to a placeholder anon key. See
  // lib/supabase/server.ts for the rationale.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required. " +
      "Set them in your environment (Vercel env / .env.local)."
    );
  }

  return createBrowserClient(url, key);
}
