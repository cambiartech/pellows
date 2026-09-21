import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  flutterwaveConfigured,
  flutterwaveVerifyTransaction,
  flutterwaveWebhookHash,
} from "@/lib/flutterwave";
import { markPaymentSucceeded } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Flutterwave webhook — set dashboard URL to /api/webhooks/flutterwave
 * and Secret hash = FLW_SECRET_HASH (verif-hash header).
 */
export async function POST(request: Request) {
  try {
    if (!flutterwaveConfigured()) {
      return NextResponse.json({ error: "not configured" }, { status: 503 });
    }

    const expected = flutterwaveWebhookHash();
    if (expected) {
      const got = request.headers.get("verif-hash");
      if (got !== expected) {
        return NextResponse.json({ error: "invalid hash" }, { status: 401 });
      }
    }

    const payload = (await request.json()) as {
      event?: string;
      data?: { id?: number; tx_ref?: string; status?: string };
    };

    const txRef = payload.data?.tx_ref;
    const flwId = payload.data?.id;
    if (!txRef || !flwId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (payload.data?.status && payload.data.status !== "successful") {
      return NextResponse.json({ ok: true, ignored: "not successful" });
    }

    const intent = await prisma.paymentIntent.findFirst({
      where: { providerRef: txRef },
    });
    if (!intent) {
      return NextResponse.json({ ok: true, ignored: "unknown tx_ref" });
    }
    if (intent.status === "SUCCEEDED") {
      return NextResponse.json({ ok: true, already: true });
    }

    const verified = await flutterwaveVerifyTransaction(String(flwId));
    if (verified.status !== "successful") {
      return NextResponse.json({ ok: true, ignored: "verify failed" });
    }

    await markPaymentSucceeded(intent.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pellows.flutterwave.webhook]", err);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
