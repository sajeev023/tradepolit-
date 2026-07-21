import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Stripe Webhook Endpoint
// POST /api/v1/stripe/webhook
export async function POST(request: NextRequest) {
  const body = await request.text();
  const reqHeaders = await headers();
  const signature = reqHeaders.get("stripe-signature") || "";

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && !webhookSecret.startsWith("mock")) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Local development or fallback mode
      console.warn("⚠️ STRIPE_WEBHOOK_SECRET is not set. Reading event payload directly without verification.");
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data?.object;

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (userId) {
          // Fetch subscription detail to get price ID
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              subscriptionStatus: "PRO_ACTIVE",
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
        const priceId = session.items.data[0]?.price.id;

        // Map stripe status to our tier
        const isPro = status === "active" || status === "trialing";

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              subscriptionStatus: isPro ? "PRO_ACTIVE" : "FREE",
            },
          });
          console.log(`🔄 Subscription updated webhook synced: user=${user.id}, status=${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const customerId = session.customer;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionStatus: "FREE",
            },
          });
          console.log(`❌ Subscription deleted/canceled webhook synced: user=${user.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response("Webhook process failed", { status: 500 });
  }
}

