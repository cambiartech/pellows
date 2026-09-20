import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBooking } from "@/lib/bookings";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const booking = await cancelBooking(id, body.reason);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
