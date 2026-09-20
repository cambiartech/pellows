import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import { slugifyTitle } from "@/lib/agency";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(8),
  city: z.string().min(2).default("Lagos"),
  country: z.string().min(2).default("Nigeria"),
  neighbourhood: z.string().optional(),
  currency: z.string().min(3).max(3).default("NGN"),
  /** Major units (e.g. 250000 NGN) — converted to minor in handler if needed */
  basePrice: z.number().positive(),
  cleaningFee: z.number().min(0).default(0),
  priceInMinor: z.boolean().optional(),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  maxGuests: z.number().int().min(1).default(2),
  amenities: z.array(z.string()).default([]),
  tourUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "LIVE", "PAUSED"]).default("DRAFT"),
  timezone: z.string().optional(),
});

export async function GET() {
  const host = await getSessionHost();
  if (!host) {
    return NextResponse.json({ error: "Please log in" }, { status: 401 });
  }

  const listings = await prisma.listing.findMany({
    where: { hostId: workspaceHostId(host) },
    orderBy: { updatedAt: "desc" },
  });

  const counts = {
    total: listings.length,
    live: listings.filter((l) => l.status === "LIVE").length,
    draft: listings.filter((l) => l.status === "DRAFT").length,
    paused: listings.filter((l) => l.status === "PAUSED").length,
  };

  return NextResponse.json({
    listings,
    counts,
    host: {
      id: host.id,
      businessName: host.businessName,
      verified: host.verified,
      role: host.role,
      commissionBps: host.commissionBps,
      termsNote: host.termsNote,
    },
  });
}

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const body = createSchema.parse(await request.json());
    const basePrice = body.priceInMinor
      ? Math.round(body.basePrice)
      : Math.round(body.basePrice * 100);
    const cleaningFee = body.priceInMinor
      ? Math.round(body.cleaningFee)
      : Math.round(body.cleaningFee * 100);

    const listing = await prisma.listing.create({
      data: {
        hostId: workspaceHostId(host),
        kind: "STAY",
        status: body.status,
        title: body.title.trim(),
        slug: slugifyTitle(body.title),
        description: body.description.trim(),
        city: body.city.trim(),
        country: body.country.trim(),
        neighbourhood: body.neighbourhood?.trim() || null,
        timezone: body.timezone || "Africa/Lagos",
        currency: body.currency.toUpperCase(),
        basePrice,
        cleaningFee,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        maxGuests: body.maxGuests,
        amenities: body.amenities,
        tourUrl: body.tourUrl || null,
        photoUrls: [],
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
