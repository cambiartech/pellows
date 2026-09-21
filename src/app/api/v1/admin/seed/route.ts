import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { seedDemoInventory } from "@/lib/seed-demo";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-shot: seed LIVE Detty listings on Neon.
 * Auth: admin session cookie OR header x-admin-secret.
 */
export async function POST(request: Request) {
  const cookieOk = await requireAdmin();
  const expected =
    process.env.ADMIN_SECRET || process.env.LLM_CHANNEL_SECRET;
  const got = request.headers.get("x-admin-secret");
  const headerOk = Boolean(expected && got === expected);

  if (!cookieOk && !headerOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedDemoInventory();
    return NextResponse.json({
      ok: true,
      message: "Demo inventory seeded",
      ...result,
    });
  } catch (err) {
    console.error("[pellows.admin.seed]", err);
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
