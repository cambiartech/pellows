import { NextResponse } from "next/server";
import { applyRealcorpEvent, verifyRealcorpSignature } from "@/lib/sources/realcorp";

export const runtime = "nodejs";

/**
 * Realcorp tells us a unit changed. We write our copy and return.
 * Guest chat does not use this route, and this route does not call Realcorp.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = verifyRealcorpSignature(
    raw,
    request.headers.get("x-realcorp-signature"),
  );
  if (signature === "unconfigured") {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (signature === "bad") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: {
    eventId?: string;
    tenantId?: string;
    event?: string;
    unit?: unknown;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventId = body.eventId?.trim() || "";
  const tenantId = body.tenantId?.trim() || "";
  const event = body.event?.trim() || "";
  if (!eventId || !tenantId || !event) {
    return NextResponse.json({ error: "eventId, tenantId, and event are required" }, { status: 400 });
  }

  const result = await applyRealcorpEvent({
    eventId,
    tenantId,
    event,
    unit: body.unit,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
