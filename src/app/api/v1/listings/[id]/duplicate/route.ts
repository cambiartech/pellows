import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import { slugifyTitle } from "@/lib/agency";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Duplicate unit — same building, another flat (DRAFT). */
export async function POST(_request: Request, { params }: Params) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const { id } = await params;
    const source = await prisma.listing.findFirst({
      where: { id, hostId: workspaceHostId(host) },
    });
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const title = source.title.includes("(copy)")
      ? source.title
      : `${source.title} (copy)`;

    const listing = await prisma.listing.create({
      data: {
        hostId: workspaceHostId(host),
        kind: source.kind,
        status: "DRAFT",
        title,
        slug: slugifyTitle(title),
        description: source.description,
        city: source.city,
        country: source.country,
        neighbourhood: source.neighbourhood,
        timezone: source.timezone,
        currency: source.currency,
        basePrice: source.basePrice,
        cleaningFee: source.cleaningFee,
        priceUnit: source.priceUnit,
        bedrooms: source.bedrooms,
        bathrooms: source.bathrooms,
        maxGuests: source.maxGuests,
        amenities: source.amenities,
        photoUrls: source.photoUrls,
        tourUrl: source.tourUrl,
        lat: source.lat,
        lng: source.lng,
        sourcePlatform: source.sourcePlatform || "manual",
        // Do not copy ical / realcorp ids — new unit needs its own calendar
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Duplicate failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
