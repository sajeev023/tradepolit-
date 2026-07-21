export const getMockUser = (email: string = "trader@tradepilot.app") => {
  const isPartner = email === "partner@tradepilot.ai";
  return {
    id: isPartner ? "partner-1234-1234-1234-123456789012" : "12345678-1234-1234-1234-123456789012",
    email: email,
    user_metadata: {
      full_name: isPartner ? "YC Partner" : "John Doe",
      avatar_url: "",
    },
    app_metadata: {
      provider: "email",
      providers: ["email"],
      role: "ADMIN",
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
};

export const getMockSession = (email: string = "trader@tradepilot.app") => {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: getMockUser(email),
  };
};

export const MOCK_USER = getMockUser("trader@tradepilot.app");
export const MOCK_SESSION = getMockSession("trader@tradepilot.app");

export function createMockSupabaseClient(defaultEmail: string = "trader@tradepilot.app") {
  const getEmail = () => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/sb-mock-email=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return defaultEmail;
  };

  return {
    auth: {
      getUser: async () => {
        const email = getEmail();
        return { data: { user: getMockUser(email) }, error: null };
      },
      getSession: async () => {
        const email = getEmail();
        return { data: { session: getMockSession(email) }, error: null };
      },
      signInWithPassword: async (credentials: any) => {
        const email = credentials?.email || getEmail();
        if (typeof window !== "undefined") {
          document.cookie = "sb-mock-session=true; path=/; max-age=3600";
          document.cookie = `sb-mock-email=${encodeURIComponent(email)}; path=/; max-age=3600`;
        }
        return { data: { user: getMockUser(email), session: getMockSession(email) }, error: null };
      },
      signUp: async (credentials: any) => {
        const email = credentials?.email || getEmail();
        if (typeof window !== "undefined") {
          document.cookie = "sb-mock-session=true; path=/; max-age=3600";
          document.cookie = `sb-mock-email=${encodeURIComponent(email)}; path=/; max-age=3600`;
        }
        return { data: { user: getMockUser(email), session: getMockSession(email) }, error: null };
      },
      signOut: async () => {
        if (typeof window !== "undefined") {
          document.cookie = "sb-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "sb-mock-email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        const email = getEmail();
        setTimeout(() => {
          callback("SIGNED_IN", getMockSession(email));
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      resetPasswordForEmail: async (email: string) => {
        return { data: {}, error: null };
      },
      updateUser: async (attributes: any) => {
        const email = getEmail();
        return { data: { user: getMockUser(email) }, error: null };
      },
      signInWithOAuth: async (options: any) => {
        const email = getEmail();
        if (typeof window !== "undefined") {
          document.cookie = "sb-mock-session=true; path=/; max-age=3600";
          document.cookie = `sb-mock-email=${encodeURIComponent(email)}; path=/; max-age=3600`;
        }
        return { data: { provider: options.provider, url: "/auth/callback?code=mock" }, error: null };
      },
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => {
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
