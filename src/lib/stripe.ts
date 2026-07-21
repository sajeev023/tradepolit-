import Stripe from "stripe";

// Check for Stripe Secret Key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock_secret_key_for_testing";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-06-24.dahlia" as any, // Modern stable version
  typescript: true,
});
