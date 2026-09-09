import Stripe from "stripe";

// Lazy Stripe singleton — the key check only runs when stripe is actually used,
// not at module-eval time. This avoids crashing `next build` when STRIPE_SECRET_KEY
// is unset in the build environment (a common, expected situation).
//
// In production, the first use without a key throws a clear error so deployments
// don't silently run with a placeholder credential.

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Refusing to initialize Stripe in production with no key."
      );
    }
    // Non-production: use a placeholder so local dev/test can boot without real credentials.
    // Any Stripe API call will fail at runtime with a clear auth error, which is expected offline.
  }

  _stripe = new Stripe(stripeSecretKey || "sk_test_local_dev_placeholder", {
    apiVersion: "2026-06-24.dahlia" as any,
    typescript: true,
  });
  return _stripe;
}

// Proxy that forwards property access to the lazy singleton. This preserves the
// `import { stripe } from "@/lib/stripe"` ergonomics while making init lazy.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop as keyof Stripe, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
}) as Stripe;