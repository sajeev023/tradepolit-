import { NextRequest } from "next/server";
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

  let event: any;

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
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
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
  } catch (dupCheckErr: any) {
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
    // Prisma's transaction client type is computed; using `any` here avoids
    // the type inference gymnastics while preserving runtime atomicity.
    await prisma.$transaction(async (tx: any) => {
      switch (event.type) {
        case "checkout.session.completed": {
          const userId = session.metadata?.userId;
          const subscriptionId = session.subscription;
          const customerId = session.customer;

          if (userId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
            const priceId = subscription.items?.data?.[0]?.price?.id;
            const expiresAt = new Date(subscription.current_period_end * 1000);

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
          const subscriptionId = session.id;
          const status = session.status;
          const customerId = session.customer;
          const expiresAt = new Date(session.current_period_end * 1000);
          const priceId = session.items?.data?.[0]?.price?.id;

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
          const customerId = session.customer;

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
  } catch (err: any) {
    // P2002 on webhookEvent.stripeEventId means a concurrent handler
    // already recorded this event — treat as success (duplicate).
    if (err?.code === "P2002") {
      console.log(`[Stripe Webhook] Event ${event.id} concurrently processed (P2002). Treating as duplicate.`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    console.error("Webhook processing error:", err);
    // 500 triggers Stripe retry. The transaction rolled back, so no
    // side-effect committed — the retry is safe.
    return new Response("Webhook process failed", { status: 500 });
  }
}