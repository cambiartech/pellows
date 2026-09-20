import { NextResponse } from "next/server";
import { searchListings } from "@/lib/search";
import type { ListingKind } from "@/generated/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const kind = searchParams.get("kind") as ListingKind | null;
    const amenitiesRaw = searchParams.get("amenities");
    const amenities = amenitiesRaw
      ? amenitiesRaw.split(",").map((a) => a.trim()).filter(Boolean)
      : undefined;

    const result = await searchListings({
      q: searchParams.get("q") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      neighbourhood: searchParams.get("neighbourhood") ?? undefined,
      kind: kind ?? undefined,
      checkIn: searchParams.get("checkIn") ?? undefined,
      checkOut: searchParams.get("checkOut") ?? undefined,
      guests: searchParams.get("guests")
        ? Number(searchParams.get("guests"))
        : undefined,
      bedrooms: searchParams.get("bedrooms")
        ? Number(searchParams.get("bedrooms"))
        : undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      amenities,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
