import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markPaymentSucceeded } from "@/lib/payments";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Confirm a Stripe Checkout Session after redirect (local/dev friendly).
 * Production should also use /api/webhooks/stripe.
 */
export async function POST(request: Request) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const body = (await request.json()) as {
      sessionId?: string;
      paymentIntentId?: string;
    };
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed yet", status: session.payment_status },
        { status: 400 },
      );
    }

    const piId =
      session.metadata?.pellowsPaymentIntentId || body.paymentIntentId;
    if (!piId) {
      return NextResponse.json(
        { error: "Missing Pellows payment intent in session metadata" },
        { status: 400 },
      );
    }

    const intent = await prisma.paymentIntent.findUnique({ where: { id: piId } });
    if (!intent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }
    if (intent.status === "SUCCEEDED") {
      return NextResponse.json({ ok: true, already: true, paymentIntentId: piId });
    }

    await markPaymentSucceeded(piId);
    return NextResponse.json({ ok: true, paymentIntentId: piId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
