/**
 * Supabase mock utilities are retained ONLY for unit tests.
 * They must never be used in production code or API routes.
 */
export const getMockUser = (email: string = "demo@example.com") => {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: email,
    user_metadata: {
      full_name: "Demo User",
      avatar_url: "",
    },
    app_metadata: {
      provider: "email",
      providers: ["email"],
      role: "USER",
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
};

export const getMockSession = (email: string = "demo@example.com") => {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: getMockUser(email),
  };
};

export const MOCK_USER = getMockUser("demo@example.com");
export const MOCK_SESSION = getMockSession("demo@example.com");

export function createMockSupabaseClient(defaultEmail: string = "demo@example.com") {
  return {
    auth: {
      getUser: async () => {
        return { data: { user: getMockUser(defaultEmail) }, error: null };
      },
      getSession: async () => {
        return { data: { session: getMockSession(defaultEmail) }, error: null };
      },
      signInWithPassword: async () => {
        return { data: { user: getMockUser(defaultEmail), session: getMockSession(defaultEmail) }, error: null };
      },
      signUp: async () => {
        return { data: { user: getMockUser(defaultEmail), session: getMockSession(defaultEmail) }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        setTimeout(() => {
          callback("SIGNED_IN", getMockSession(defaultEmail));
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      resetPasswordForEmail: async () => {
        return { data: {}, error: null };
      },
      updateUser: async () => {
        return { data: { user: getMockUser(defaultEmail) }, error: null };
      },
      signInWithOAuth: async () => {
        return { data: { provider: "email", url: "/auth/callback?code=mock" }, error: null };
      },
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` } };
        },
        createSignedUrl: async (path: string) => {
          return { data: { signedUrl: `https://mock-storage.com/${bucket}/${path}?token=mock` }, error: null };
        },
      }),
    },
  };
}
