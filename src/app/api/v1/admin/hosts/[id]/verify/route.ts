import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Admin: mark agency verified after field visit. Header: x-admin-secret */
export async function POST(request: Request, { params }: Params) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const host = await prisma.host.update({
    where: { id },
    data: { verified: true },
    select: { id: true, email: true, businessName: true, verified: true },
  });
  return NextResponse.json({ host });
}
