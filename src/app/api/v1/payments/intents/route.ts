import { NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentIntent } from "@/lib/payments";

export const runtime = "nodejs";

const bodySchema = z.object({
  bookingId: z.string(),
  method: z.enum(["CARD", "BANK_RAIL", "CRYPTO"]),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const intent = await createPaymentIntent(body);
    return NextResponse.json({ paymentIntent: intent }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
