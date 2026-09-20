import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, isOwner } from "@/lib/agency-auth";

export const runtime = "nodejs";

const schema = z.object({
  commissionBps: z.number().int().min(0).max(5000).optional(),
  termsNote: z.string().max(2000).optional(),
});

export async function GET() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const owner =
    host.agencyOwnerId
      ? await prisma.host.findUnique({ where: { id: host.agencyOwnerId } })
      : host;

  if (!owner) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  return NextResponse.json({
    commissionBps: owner.commissionBps,
    commissionPercent: owner.commissionBps / 100,
    termsNote:
      owner.termsNote ||
      "Pellows takes a transparent platform fee on confirmed stays. Payouts go to your bank or crypto wallet after check-in.",
    verified: owner.verified,
  });
}

export async function PATCH(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isOwner(host)) {
      return NextResponse.json({ error: "Only owners can edit terms" }, { status: 403 });
    }
    const body = schema.parse(await request.json());
    const updated = await prisma.host.update({
      where: { id: host.id },
      data: {
        ...(body.commissionBps != null ? { commissionBps: body.commissionBps } : {}),
        ...(body.termsNote != null ? { termsNote: body.termsNote.trim() } : {}),
      },
    });
    return NextResponse.json({
      commissionBps: updated.commissionBps,
      termsNote: updated.termsNote,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
