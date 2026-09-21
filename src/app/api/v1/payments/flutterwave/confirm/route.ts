import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { flutterwaveConfigured, flutterwaveVerifyTransaction } from "@/lib/flutterwave";
import { markPaymentSucceeded } from "@/lib/payments";

export const runtime = "nodejs";

const schema = z.object({
  paymentIntentId: z.string().min(1),
  transactionId: z.string().min(1),
});

/** After Flutterwave redirect — verify then confirm booking. */
export async function POST(request: Request) {
  try {
    if (!flutterwaveConfigured()) {
      return NextResponse.json(
        { error: "Flutterwave is not configured" },
        { status: 503 },
      );
    }

    const body = schema.parse(await request.json());
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: body.paymentIntentId },
    });
    if (!intent) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
    }
    if (intent.status === "SUCCEEDED") {
      return NextResponse.json({ ok: true, already: true });
    }

    const verified = await flutterwaveVerifyTransaction(body.transactionId);
    if (verified.status !== "successful") {
      return NextResponse.json(
        { error: `Payment not successful (${verified.status})` },
        { status: 400 },
      );
    }

    const expectedRef = intent.providerRef || intent.id;
    if (verified.tx_ref && verified.tx_ref !== expectedRef) {
      return NextResponse.json({ error: "tx_ref mismatch" }, { status: 400 });
    }

    const updated = await markPaymentSucceeded(intent.id);
    return NextResponse.json({ ok: true, paymentIntent: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Flutterwave confirm failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
