import { NextResponse } from "next/server";
import {
  mintAdminToken,
  setAdminCookie,
  verifyAdminLogin,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyAdminLogin(body.email || "", body.password || "")) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  const token = mintAdminToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
