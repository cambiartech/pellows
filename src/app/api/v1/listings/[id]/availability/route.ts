import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function parseYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Dates must be YYYY-MM-DD");
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

/**
 * Host-facing availability / conflict check for a listing.
 * GET ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
 * Also returns upcoming busy ranges when no dates given.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findFirst({
      where: { id, hostId: workspaceHostId(host) },
      select: { id: true, title: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const checkIn = url.searchParams.get("checkIn");
    const checkOut = url.searchParams.get("checkOut");

    const upcoming = await prisma.calendarBlock.findMany({
      where: {
        listingId: id,
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 12,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        source: true,
        summary: true,
      },
    });

    const blocks = upcoming.map((b) => ({
      id: b.id,
      startDate: b.startDate.toISOString().slice(0, 10),
      endDate: b.endDate.toISOString().slice(0, 10),
      source: b.source,
      summary: b.summary,
    }));

    if (!checkIn || !checkOut) {
      return NextResponse.json({ listingId: id, blocks });
    }

    const start = parseYmd(checkIn);
    const end = parseYmd(checkOut);
    if (!(end > start)) {
      return NextResponse.json(
        { error: "checkOut must be after checkIn" },
        { status: 400 },
      );
    }

    const conflicts = await prisma.calendarBlock.findMany({
      where: {
        listingId: id,
        startDate: { lt: end },
        endDate: { gt: start },
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        source: true,
        summary: true,
      },
    });

    const conflictList = conflicts.map((b) => ({
      id: b.id,
      startDate: b.startDate.toISOString().slice(0, 10),
      endDate: b.endDate.toISOString().slice(0, 10),
      source: b.source,
      summary: b.summary,
    }));

    const available = conflictList.length === 0;
    const message = available
      ? `${checkIn} → ${checkOut} is free`
      : `Already booked / blocked ${conflictList
          .map((c) => `${c.startDate}–${c.endDate}`)
          .join(", ")}`;

    return NextResponse.json({
      listingId: id,
      checkIn,
      checkOut,
      available,
      message,
      conflicts: conflictList,
      blocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Availability check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
