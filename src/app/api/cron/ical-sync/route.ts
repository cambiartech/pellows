import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchIcal, parseIcalBusyRanges } from "@/lib/ical";

export const runtime = "nodejs";

/**
 * Re-sync all listings that have an icalUrl.
 * Protect with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 * Or ?secret= for simple cron ping.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const ok =
    secret &&
    (auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret);

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await prisma.listing.findMany({
    where: { icalUrl: { not: null } },
    select: { id: true, icalUrl: true, title: true },
  });

  const results: { id: string; title: string; ok: boolean; blocks?: number; error?: string }[] =
    [];

  for (const listing of listings) {
    if (!listing.icalUrl) continue;
    try {
      const ics = await fetchIcal(listing.icalUrl);
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
          data: { icalSyncedAt: new Date() },
        });
      });
      results.push({ id: listing.id, title: listing.title, ok: true, blocks: events.length });
    } catch (err) {
      results.push({
        id: listing.id,
        title: listing.title,
        ok: false,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return NextResponse.json({
    synced: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
