import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appBaseUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

const schema = z.object({
  paymentIntentId: z.string().min(1),
});

/**
 * Create a Stripe Checkout Session for a Pellows payment intent (CARD).
 * Guest pays on Stripe-hosted page; webhook / success confirms our booking.
 */
export async function POST(request: Request) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured (STRIPE_SECRET_KEY)" },
        { status: 503 },
      );
    }

    const body = schema.parse(await request.json());
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: body.paymentIntentId },
      include: {
        booking: { include: { listing: { select: { title: true, city: true } } } },
      },
    });
    if (!intent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }
    if (intent.method !== "CARD") {
      return NextResponse.json(
        { error: "Stripe checkout is only for CARD" },
        { status: 400 },
      );
    }
    if (intent.status === "SUCCEEDED") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const stripe = getStripe();
    const base = appBaseUrl();
    const title =
      intent.booking.listing?.title ||
      `Pellows stay (${intent.booking.listing?.city || "Lagos"})`;

    // Stripe expects major currency units for zero-decimal? NGN is zero-decimal in Stripe
    // https://docs.stripe.com/currencies#zero-decimal
    const zeroDecimal = ["NGN", "JPY", "KRW", "VND"].includes(
      intent.currency.toUpperCase(),
    );
    const unitAmount = zeroDecimal
      ? Math.round(intent.amount / 100) // we store minor; NGN Stripe wants whole naira
      : intent.amount;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: intent.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: title,
              description: `Booking ${intent.bookingId.slice(0, 8)}… · ${String(intent.booking.checkIn).slice(0, 10)} → ${String(intent.booking.checkOut).slice(0, 10)}`,
            },
          },
        },
      ],
      metadata: {
        pellowsPaymentIntentId: intent.id,
        pellowsBookingId: intent.bookingId,
        pellowsProviderRef: intent.providerRef || "",
      },
      success_url: `${base}/pay/${intent.id}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pay/${intent.id}?stripe=cancel`,
    });

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        instructions: {
          ...(typeof intent.instructions === "object" && intent.instructions
            ? (intent.instructions as object)
            : {}),
          type: "CARD",
          provider: "stripe",
          stripeCheckoutSessionId: session.id,
          checkoutUrl: session.url,
        },
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
