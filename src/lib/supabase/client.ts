import { createBrowserClient } from "@supabase/ssr";
import { createMockSupabaseClient } from "./mock";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("mockproject.supabase.co")) {
    return createMockSupabaseClient() as any;
  }

  // Explicit demo session bypass.
  if (typeof window !== "undefined" && document.cookie.includes("sb-mock-session=true")) {
    const match = document.cookie.match(/sb-mock-email=([^;]+)/);
    const email = match ? decodeURIComponent(match[1]) : "trader@tradepilot.app";
    return createMockSupabaseClient(email) as any;
  }

  const realClient = createBrowserClient(url, key);

  const demoEmails = new Set(["trader@tradepilot.app", "partner@tradepilot.ai"]);
  const originalSignIn = realClient.auth.signInWithPassword.bind(realClient.auth);
  realClient.auth.signInWithPassword = (async (credentials: any) => {
    if (credentials && "email" in credentials && demoEmails.has(credentials.email)) {
      document.cookie = "sb-mock-session=true; path=/; max-age=3600; SameSite=Lax";
      document.cookie = `sb-mock-email=${encodeURIComponent(credentials.email)}; path=/; max-age=3600; SameSite=Lax`;
      const mockClient = createMockSupabaseClient(credentials.email);
      return mockClient.auth.signInWithPassword(credentials) as any;
    }
    return originalSignIn(credentials);
  }) as any;

  const originalSignUp = realClient.auth.signUp.bind(realClient.auth);
  realClient.auth.signUp = (async (credentials: any) => {
    if (credentials && "email" in credentials && demoEmails.has(credentials.email)) {
      document.cookie = "sb-mock-session=true; path=/; max-age=3600; SameSite=Lax";
      document.cookie = `sb-mock-email=${encodeURIComponent(credentials.email)}; path=/; max-age=3600; SameSite=Lax`;
      const mockClient = createMockSupabaseClient(credentials.email);
      return mockClient.auth.signUp(credentials) as any;
    }
    return originalSignUp(credentials);
  }) as any;

  return realClient;
}
