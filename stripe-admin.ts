// Stripe Checkout + webhook handling. Requires real STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_ID in .env — see .env.example.
// Until those are set, checkout-session creation and webhook verification
// both fail with a clear "not configured" error rather than pretending to
// process a real subscription.
import Stripe from "stripe";

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
export const isStripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set — see .env.example.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/**
 * Creates a Stripe Checkout session for the $5.99/mo subscription. The
 * caller (server.ts) is responsible for requiring auth first — uid is
 * passed as client_reference_id so the webhook can map the resulting
 * subscription back to a Firestore user without needing Stripe Customer
 * metadata lookups.
 */
export async function createCheckoutSession(uid: string, origin: string): Promise<string> {
  if (!isStripeConfigured) {
    throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in .env.");
  }
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    client_reference_id: uid,
    // Stamped onto the resulting Subscription object too, not just this
    // Session — later renewal/cancellation webhooks only carry the
    // Subscription, so without this they'd have no way back to a uid.
    subscription_data: { metadata: { uid } },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  if (!isStripeWebhookConfigured) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — see .env.example.");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}

/**
 * Extracts (uid, stripeCustomerId, isPremium) from a webhook event, for the
 * event types the spec calls for. Returns null for event types we don't act on.
 */
export function interpretWebhookEvent(
  event: Stripe.Event
): { uid: string | null; stripeCustomerId: string; isPremium: boolean } | null {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === "active" || sub.status === "trialing";
      return {
        uid: sub.metadata?.uid ?? null,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        isPremium: isActive,
      };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return {
        uid: sub.metadata?.uid ?? null,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        isPremium: false,
      };
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        uid: session.client_reference_id ?? null,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? ""),
        isPremium: true,
      };
    }
    default:
      return null;
  }
}
