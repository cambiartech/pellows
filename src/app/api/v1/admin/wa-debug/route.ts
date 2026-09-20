import { NextResponse } from "next/server";
import { listWaDebug } from "@/lib/wa-debug";

export const runtime = "nodejs";

/** Recent WhatsApp webhook hits (persisted in DB — survives Netlify instances). */
export async function GET() {
  const events = await listWaDebug();
  return NextResponse.json({
    events,
    tip:
      events.length === 0 || events.every((e) => e.method === "GET")
        ? "Only verify GETs so far. In Meta → Use cases → Customize → Configuration → Webhook → Manage → subscribe messages, then text the test number again."
        : "Inbound POSTs are reaching Netlify.",
  });
}
