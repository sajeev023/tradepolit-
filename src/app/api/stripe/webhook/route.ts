import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// In production, signature verification is mandatory and the dev escape
// hatch must never be enabled. Fail fast at module load if it is.
if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_UNVERIFIED_STRIPE_WEBHOOKS === "true"
) {
  throw new Error(
    "ALLOW_UNVERIFIED_STRIPE_WEBHOOKS must not be enabled in production — " +
    "it disables Stripe webhook signature verification."
  );
}

// Stripe Webhook Endpoint
// POST /api/stripe/webhook
export async function POST(request: NextRequest) {
  const body = await request.text();
  const reqHeaders = await headers();
  const signature = reqHeaders.get("stripe-signature") || "";

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && !webhookSecret.startsWith("mock")) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else if (process.env.ALLOW_UNVERIFIED_STRIPE_WEBHOOKS === "true") {
      console.warn("⚠️ Reading Stripe event payload without signature verification (local dev only).");
      event = JSON.parse(body);
    } else {
      console.error("❌ Stripe webhook signature verification unavailable. Set STRIPE_WEBHOOK_SECRET or ALLOW_UNVERIFIED_STRIPE_WEBHOOKS=true for local testing.");
      return new Response("Webhook Error: signature verification unavailable", { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Webhook signature verification failed: ${msg}`);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  // Idempotency guard: ignore duplicate event IDs to prevent double-processing.
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existingEvent) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
  } catch (dupCheckErr: unknown) {
    // If the idempotency lookup itself fails we MUST NOT proceed — without
    // the guard we'd risk double-processing on Stripe's retry. Return 500
    // so Stripe retries after backoff.
    console.error("[Stripe Webhook] Idempotency lookup failed:", dupCheckErr);
    return new Response("Webhook process failed (idempotency check)", { status: 500 });
  }

  const session = event.data?.object;
  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    // Atomicity: every side-effect (userProfile.update) and the
    // webhookEvent.create are committed in a single transaction. If the
    // event record fails to write, the side-effect rolls back — Stripe
    // retries, the idempotency check finds nothing, and the handler
    // re-runs cleanly. No partial-commit / double-processing window.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      switch (event.type) {
        case "checkout.session.completed": {
          // Stripe guarantees `data.object` is a Checkout.Session for this
          // event type; narrow the union so the rest of the block is type-safe
          // (the prior code left `session` as `any` and silently tolerated
          // missing/wrong fields).
          const checkout = session as Stripe.Checkout.Session;
          const userId = checkout.metadata?.userId;
          const subscriptionRef = checkout.subscription;
          const customerRef = checkout.customer;

          if (userId && subscriptionRef) {
            const subscriptionId = typeof subscriptionRef === "string"
              ? subscriptionRef
              : subscriptionRef.id;
            const customerId = customerRef == null
              ? null
              : typeof customerRef === "string"
                ? customerRef
                : customerRef.id;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            // In Stripe API 2026-06-24, `current_period_end` moved off the
            // Subscription object onto its SubscriptionItem. The prior code read
            // `subscription.current_period_end` through `as any`, which silently
            // returned `undefined` → `new Date(NaN)` (Invalid Date), disabling
            // the defensive expiry guard in `resolvePlan`. Read the real value
            // from the first item now.
            const firstItem = subscription.items.data[0];
            const priceId = firstItem?.price?.id;
            const periodEnd = firstItem?.current_period_end;
            const expiresAt = periodEnd != null ? new Date(periodEnd * 1000) : null;

            await tx.userProfile.update({
              where: { userId },
              data: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId ?? undefined,
                plan: "PRO",
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: expiresAt,
              },
            });
            console.log(`✅ Subscription complete webhook synced: user=${userId}`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = session as Stripe.Subscription;
          const subscriptionId = subscription.id;
          const status = subscription.status;
          const customerRef = subscription.customer;
          const customerId = customerRef == null
            ? null
            : typeof customerRef === "string"
              ? customerRef
              : customerRef.id;
          // `current_period_end` lives on the SubscriptionItem in this API
          // version (see the checkout case above for the full rationale).
          const firstItem = subscription.items.data[0];
          const priceId = firstItem?.price?.id;
          const periodEnd = firstItem?.current_period_end;
          const expiresAt = periodEnd != null ? new Date(periodEnd * 1000) : null;

          const isPro = status === "active" || status === "trialing";

          const profile = await tx.userProfile.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (profile) {
            await tx.userProfile.update({
              where: { id: profile.id },
              data: {
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId ?? undefined,
                plan: isPro ? "PRO" : "FREE",
                subscriptionStatus: isPro ? "ACTIVE" : "INACTIVE",
                subscriptionExpiresAt: expiresAt,
              },
            });
            console.log(`🔄 Subscription updated webhook synced: user=${profile.userId}, status=${status}`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = session as Stripe.Subscription;
          const customerRef = subscription.customer;
          const customerId = customerRef == null
            ? null
            : typeof customerRef === "string"
              ? customerRef
              : customerRef.id;

          const profile = await tx.userProfile.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (profile) {
            await tx.userProfile.update({
              where: { id: profile.id },
              data: {
                stripeSubscriptionId: null,
                stripePriceId: null,
                plan: "FREE",
                subscriptionStatus: "INACTIVE",
                subscriptionExpiresAt: null,
              },
            });
            console.log(`❌ Subscription deleted/canceled webhook synced: user=${profile.userId}`);
          }
          break;
        }

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Record the event inside the same transaction. If this fails (unique
      // constraint P2002 = concurrent duplicate, or any other error), the
      // whole transaction rolls back and we return 500 so Stripe retries.
      await tx.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          processedAt: new Date(),
        },
      });
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: unknown) {
    // P2002 on webhookEvent.stripeEventId means a concurrent handler
    // already recorded this event — treat as success (duplicate).
    if ((err as { code?: string })?.code === "P2002") {
      console.log(`[Stripe Webhook] Event ${event.id} concurrently processed (P2002). Treating as duplicate.`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    console.error("Webhook processing error:", err);
    // 500 triggers Stripe retry. The transaction rolled back, so no
    // side-effect committed — the retry is safe.
    return new Response("Webhook process failed", { status: 500 });
  }
}