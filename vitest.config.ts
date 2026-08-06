import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      USE_DB_MOCK: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      DATABASE_URL: "postgres://postgres:test@localhost:5432/tradcopilot_test",
      DIRECT_URL: "postgres://postgres:test@localhost:5432/tradcopilot_test",
      STRIPE_SECRET_KEY: "sk_test_mock_secret_key_for_testing",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_mock_key_for_testing",
      STRIPE_WEBHOOK_SECRET: "whsec_mock_secret_for_testing",
      CRON_SECRET: "test-cron-secret",
      ADMIN_SECRET: "test-admin-secret",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
