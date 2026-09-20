import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Safe status — no secrets. Confirms DB inventory + WhatsApp outbound wiring. */
export async function GET() {
  const { prisma } = await import("@/lib/db");
  let listings = 0;
  let dbOk = false;
  let dbError: string | null = null;
  try {
    listings = await prisma.listing.count({ where: { status: "LIVE" } });
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message.slice(0, 120) : "db error";
  }

  const whatsappOutboundReady = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );

  return NextResponse.json({
    ok: dbOk,
    liveListings: listings,
    dbError,
    whatsappOutboundReady,
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || null,
    hint: !listings
      ? "Listing table empty — redeploy so build seed runs, or POST /api/v1/admin/seed"
      : !whatsappOutboundReady
        ? "Set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID on Netlify, then redeploy"
        : "Ready",
  });
}
