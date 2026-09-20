import { NextResponse } from "next/server";
import { markPaymentSucceeded } from "@/lib/payments";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — set STRIPE_WEBHOOK_SECRET from Dashboard → Webhooks.
 * Local: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await request.text();

  let event;
  try {
    if (secret) {
      const sig = request.headers.get("stripe-signature");
      if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else {
      // Dev only — prefer signed webhooks in production
      event = JSON.parse(raw);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "STRIPE_WEBHOOK_SECRET required in production" },
          { status: 500 },
        );
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as {
        payment_status?: string;
        metadata?: { pellowsPaymentIntentId?: string };
      };
      const piId = session.metadata?.pellowsPaymentIntentId;
      if (piId && session.payment_status === "paid") {
        await markPaymentSucceeded(piId);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Handler failed";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
