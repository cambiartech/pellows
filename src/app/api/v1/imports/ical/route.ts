import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import { fetchIcal, parseIcalBusyRanges } from "@/lib/ical";

export const runtime = "nodejs";

const schema = z.object({
  listingId: z.string().min(1),
  icalUrl: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const listing = await prisma.listing.findFirst({
      where: { id: body.listingId, hostId: workspaceHostId(host) },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const ics = await fetchIcal(body.icalUrl);
    const events = parseIcalBusyRanges(ics);

    await prisma.$transaction(async (tx) => {
      await tx.calendarBlock.deleteMany({
        where: { listingId: listing.id, source: "ICAL" },
      });

      if (events.length) {
        await tx.calendarBlock.createMany({
          data: events.map((e) => ({
            listingId: listing.id,
            startDate: new Date(`${e.startDate}T00:00:00.000Z`),
            endDate: new Date(`${e.endDate}T00:00:00.000Z`),
            source: "ICAL" as const,
            externalUid: e.uid.slice(0, 190),
            summary: e.summary?.slice(0, 190) || "OTA busy",
          })),
        });
      }

      await tx.listing.update({
        where: { id: listing.id },
        data: {
          icalUrl: body.icalUrl,
          icalSyncedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      ok: true,
      listingId: listing.id,
      blocksImported: events.length,
      icalSyncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "iCal import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
