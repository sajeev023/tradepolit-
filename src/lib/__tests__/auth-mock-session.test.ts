import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// getAuthUser pulls createClient from @/lib/supabase/server and cookies from
// next/headers. We stub both so the test exercises only the mock-session
// backdoor logic, with no real Supabase network call and no real cookie store.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { getAuthUser } from "../auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

function noUserSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
}

function cookieStoreWithMockSession(email = "demo@tradcopilot.com") {
  return {
    get: (name: string) => {
      if (name === "sb-mock-session") return { value: "true" };
      if (name === "sb-mock-email") return { value: encodeURIComponent(email) };
      return undefined;
    },
  };
}

describe("getAuthUser — sb-mock-session backdoor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects the sb-mock-session cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    (createClient as any).mockResolvedValue(noUserSupabase());
    (cookies as any).mockResolvedValue(cookieStoreWithMockSession());

    const { user, error } = await getAuthUser();

    expect(user).toBeNull();
    expect(error).toBeDefined();
    // The cookie backdoor must not even be consulted in production.
    expect(cookies).not.toHaveBeenCalled();
  });

  it("honors the sb-mock-session cookie in non-production (dev/test demo)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    (createClient as any).mockResolvedValue(noUserSupabase());
    (cookies as any).mockResolvedValue(cookieStoreWithMockSession());

    const { user, error } = await getAuthUser();

    expect(error).toBeNull();
    expect(user).not.toBeNull();
    expect(user?.id).toBe("partner-1234-1234-1234-123456789012");
    expect(user?.email).toBe("demo@tradcopilot.com");
    expect(user?.app_metadata?.role).toBe("USER");
  });

  it("falls through to unauthorized when the cookie is absent in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    (createClient as any).mockResolvedValue(noUserSupabase());
    (cookies as any).mockResolvedValue({ get: () => undefined });

    const { user, error } = await getAuthUser();

    expect(user).toBeNull();
    expect(error).toBeDefined();
  });
});