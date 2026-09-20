import { NextResponse } from "next/server";
import { z } from "zod";
import { markPaymentSucceeded } from "@/lib/payments";

export const runtime = "nodejs";

const bodySchema = z.object({
  paymentIntentId: z.string(),
  /** Dev bypass until processor/crypto/bank webhooks are wired */
  devConfirm: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    if (process.env.NODE_ENV === "production" && body.devConfirm) {
      return NextResponse.json(
        { error: "devConfirm disabled in production" },
        { status: 403 },
      );
    }
    const result = await markPaymentSucceeded(body.paymentIntentId);
    return NextResponse.json({ paymentIntent: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
