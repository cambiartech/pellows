import { NextResponse } from "next/server";
import { seedDemoInventory } from "@/lib/seed-demo";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-shot: seed LIVE Detty listings on Neon.
 * Header: x-admin-secret: <ADMIN_SECRET or LLM_CHANNEL_SECRET>
 */
export async function POST(request: Request) {
  const expected =
    process.env.ADMIN_SECRET || process.env.LLM_CHANNEL_SECRET;
  const got = request.headers.get("x-admin-secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedDemoInventory();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[pellows.admin.seed]", err);
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
