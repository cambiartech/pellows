import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import { slugifyTitle } from "@/lib/agency";
import { draftFromListingUrl } from "@/lib/listing-url-import";

export const runtime = "nodejs";

const schema = z.object({
  url: z.string().url(),
  neighbourhood: z.string().optional(),
  basePrice: z.number().positive().optional(),
  goLive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const draft = draftFromListingUrl(body.url);
    const basePrice = Math.round((body.basePrice ?? draft.basePrice) * 100);

    const listing = await prisma.listing.create({
      data: {
        hostId: workspaceHostId(host),
        kind: "STAY",
        status: body.goLive ? "LIVE" : "DRAFT",
        title: draft.title,
        slug: slugifyTitle(draft.title),
        description: draft.description,
        city: draft.city,
        country: draft.country,
        neighbourhood: body.neighbourhood?.trim() || draft.neighbourhood || null,
        timezone: "Africa/Lagos",
        currency: draft.currency,
        basePrice,
        cleaningFee: 0,
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        amenities: [],
        sourcePlatform: draft.sourcePlatform,
        externalListingUrl: draft.externalListingUrl,
      },
    });

    return NextResponse.json(
      { listing, notes: draft.notes },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "URL import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
