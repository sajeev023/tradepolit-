import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// A safe relative redirect path: must start with a single "/", must not be a
// protocol-relative URL ("//") or a backslash-prefixed path ("\\") which
// browsers treat as an absolute URL, and must not carry credentials ("@").
// Rejects anything that could resolve to a different origin.
function safeRedirectPath(redirectTo: string | null): string {
  const fallback = "/charts";
  if (!redirectTo) return fallback;
  // Block protocol-relative and backslash-prefixed (browser escape) vectors.
  if (redirectTo.startsWith("//") || redirectTo.startsWith("/\\")) return fallback;
  // Block scheme:// and userinfo-bearing URLs that could redirect off-origin.
  if (/:/.test(redirectTo.split("/")[1] ?? "") || redirectTo.includes("@")) return fallback;
  // Must be a same-origin relative path.
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("/.")) return fallback;
  return redirectTo;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // Return to login on error
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}