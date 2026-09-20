import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import {
  getSessionHost,
  isOwner,
  workspaceHostId,
} from "@/lib/agency-auth";

export const runtime = "nodejs";

export async function GET() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const ownerId = workspaceHostId(host);
  const accounts = await prisma.hostPayoutAccount.findMany({
    where: { hostId: ownerId },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ accounts });
}

const schema = z.object({
  kind: z.enum(["BANK", "CRYPTO_WALLET"]),
  label: z.string().min(2),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isOwner(host)) {
      return NextResponse.json({ error: "Only owners can edit payouts" }, { status: 403 });
    }

    const body = schema.parse(await request.json());
    const ownerId = workspaceHostId(host);

    if (body.isDefault) {
      await prisma.hostPayoutAccount.updateMany({
        where: { hostId: ownerId },
        data: { isDefault: false },
      });
    }

    const account = await prisma.hostPayoutAccount.create({
      data: {
        hostId: ownerId,
        kind: body.kind,
        label: body.label.trim(),
        details: body.details as Prisma.InputJsonValue,
        isDefault: body.isDefault ?? false,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
