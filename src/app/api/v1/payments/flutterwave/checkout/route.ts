import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  appBaseUrl,
  flutterwaveConfigured,
  flutterwaveInitiatePayment,
} from "@/lib/flutterwave";
import { ngnMinorToUsdMinor } from "@/lib/money";

export const runtime = "nodejs";

const schema = z.object({
  paymentIntentId: z.string().min(1),
  email: z.string().email().optional(),
});

/**
 * Flutterwave Standard Checkout — charge guests in USD (FX from NGN inventory).
 */
export async function POST(request: Request) {
  try {
    if (!flutterwaveConfigured()) {
      return NextResponse.json(
        { error: "Flutterwave is not configured (FLW_SECRET_KEY)" },
        { status: 503 },
      );
    }

    const body = schema.parse(await request.json());
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: body.paymentIntentId },
      include: {
        booking: {
          include: {
            listing: { select: { title: true, city: true } },
            guest: { select: { email: true, phone: true, name: true } },
          },
        },
      },
    });
    if (!intent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }
    if (intent.method !== "CARD") {
      return NextResponse.json(
        { error: "Flutterwave checkout is only for CARD" },
        { status: 400 },
      );
    }
    if (intent.status === "SUCCEEDED") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const currency = intent.currency.toUpperCase();
    const chargeCurrency = currency === "NGN" ? "USD" : currency;
    const chargeMinor =
      currency === "NGN" ? ngnMinorToUsdMinor(intent.amount) : intent.amount;
    const amountMajor =
      chargeCurrency === "USD"
        ? Math.round(chargeMinor) / 100
        : Math.round(chargeMinor / 100);

    const base = appBaseUrl();
    const txRef = intent.providerRef || intent.id;
    const email =
      body.email ||
      intent.booking.guest?.email ||
      `guest+${intent.bookingId.slice(0, 8)}@pellows.stay`;

    const { link } = await flutterwaveInitiatePayment({
      txRef,
      amountMajor,
      currency: chargeCurrency,
      redirectUrl: `${base}/pay/${intent.id}?flw=return`,
      customer: {
        email,
        name: intent.booking.guestName || intent.booking.guest?.name || "Guest",
        phonenumber: intent.booking.guestPhone || intent.booking.guest?.phone || undefined,
      },
      title: intent.booking.listing?.title || "Pellows stay",
      meta: {
        pellowsPaymentIntentId: intent.id,
        pellowsBookingId: intent.bookingId,
      },
    });

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        instructions: {
          ...(typeof intent.instructions === "object" && intent.instructions
            ? (intent.instructions as object)
            : {}),
          type: "CARD",
          provider: "flutterwave",
          chargeCurrency,
          chargeAmountMinor: chargeMinor,
          checkoutUrl: link,
          txRef,
        },
      },
    });

    return NextResponse.json({
      url: link,
      txRef,
      chargeCurrency,
      chargeAmountMinor: chargeMinor,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Flutterwave checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
