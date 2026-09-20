import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

const blockSchema = z.object({
  listingId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  summary: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const body = blockSchema.parse(await request.json());
    const listing = await prisma.listing.findFirst({
      where: { id: body.listingId, hostId: workspaceHostId(host) },
    });
    if (!listing) throw new Error("Listing not found");

    const startDate = new Date(`${body.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${body.endDate}T00:00:00.000Z`);
    if (!(endDate > startDate)) throw new Error("endDate must be after startDate");

    const block = await prisma.calendarBlock.create({
      data: {
        listingId: body.listingId,
        startDate,
        endDate,
        source: "MANUAL",
        summary: body.summary || "Owner block",
      },
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Block failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get("id");
    if (!blockId) throw new Error("id required");

    const block = await prisma.calendarBlock.findFirst({
      where: {
        id: blockId,
        source: "MANUAL",
        listing: { hostId: workspaceHostId(host) },
      },
    });
    if (!block) throw new Error("Block not found");

    await prisma.calendarBlock.delete({ where: { id: block.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
