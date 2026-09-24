import { NextResponse } from "next/server";
import { imessageInboundText } from "@/lib/channels/imessage";
import { runChannelInbound } from "@/lib/channels/run";

export const runtime = "nodejs";

/**
 * Apple Messages for Business, forwarded by the MSP.
 * Refuses traffic until AMB_WEBHOOK_SECRET is set.
 * Apple's own JWT stays between Apple and the MSP; this secret is ours.
 */
export async function POST(request: Request) {
  const secret = process.env.AMB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "iMessage not configured" }, { status: 503 });
  }
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = imessageInboundText(body);
  const userKey = String(
    (body as { sourceId?: string } | null)?.sourceId || "",
  ).trim();
  if (!text || !userKey) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await runChannelInbound({
      channel: "imessage",
      userKey,
      text,
    });
    return NextResponse.json({ ok: true, dryRun: result.delivered.dryRun });
  } catch (err) {
    console.error("[pellows.imessage]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
