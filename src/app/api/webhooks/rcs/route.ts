import { NextResponse } from "next/server";
import { rcsInboundText } from "@/lib/channels/rcs";
import { runChannelInbound } from "@/lib/channels/run";

export const runtime = "nodejs";

/**
 * Google Messages / RCS for Business.
 * Accepts a direct webhook or a Pub/Sub push (`message.data` base64).
 * Refuses traffic until RCS_WEBHOOK_SECRET is set.
 */
export async function POST(request: Request) {
  const secret = process.env.RCS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "RCS not configured" }, { status: 503 });
  }
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const inbound = rcsInboundText(body);
  if (!inbound) return NextResponse.json({ ok: true, ignored: true });

  try {
    const result = await runChannelInbound({
      channel: "rcs",
      userKey: inbound.from,
      text: inbound.text,
    });
    return NextResponse.json({ ok: true, dryRun: result.delivered.dryRun });
  } catch (err) {
    console.error("[pellows.rcs]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
