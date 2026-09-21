import { NextResponse } from "next/server";
import {
  mintAdminToken,
  setAdminCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password || "")) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const token = mintAdminToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
