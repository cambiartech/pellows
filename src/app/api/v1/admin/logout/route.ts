import { NextResponse } from "next/server";
import { clearAdminCookie, requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
