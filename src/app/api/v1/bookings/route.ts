import { NextResponse } from "next/server";
import { z } from "zod";
import { createHold } from "@/lib/bookings";

export const runtime = "nodejs";

const bodySchema = z.object({
  listingId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
  channel: z
    .enum(["WEB", "WHATSAPP", "LLM_CHATGPT", "LLM_GEMINI", "LLM_OTHER", "API"])
    .optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const booking = await createHold(body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
