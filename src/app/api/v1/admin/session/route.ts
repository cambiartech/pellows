import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const ok = await requireAdmin();
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
