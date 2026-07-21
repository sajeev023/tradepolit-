import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Stripe Webhook Endpoint
// POST /api/stripe/webhook
export async function POST(request: NextRequest) {
  const body = await request.text();
  const reqHeaders = await headers();
  const signature = reqHeaders.get("stripe-signature") || "";

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // In production, signature verification is mandatory. We only allow unverified
  // local parsing when explicitly opted in via ALLOW_UNVERIFIED_STRIPE_WEBHOOKS.
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
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existingEvent) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  const session = event.data?.object;

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const expiresAt = new Date(subscription.current_period_end * 1000);

          await prisma.userProfile.update({
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

        const profile = await prisma.userProfile.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (profile) {
          await prisma.userProfile.update({
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

        const profile = await prisma.userProfile.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (profile) {
          await prisma.userProfile.update({
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

    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
      },
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response("Webhook process failed", { status: 500 });
  }
}

