import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.status === "ARCHIVED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ listing });
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "LIVE", "PAUSED", "ARCHIVED"]).optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(8).optional(),
  basePrice: z.number().positive().optional(),
  cleaningFee: z.number().min(0).optional(),
  priceInMinor: z.boolean().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  maxGuests: z.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  neighbourhood: z.string().optional(),
  city: z.string().min(2).optional(),
  currency: z.string().min(3).max(3).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.listing.findFirst({
      where: { id, hostId: workspaceHostId(host) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.title) data.title = body.title.trim();
    if (body.description) data.description = body.description.trim();
    if (body.bedrooms != null) data.bedrooms = body.bedrooms;
    if (body.bathrooms != null) data.bathrooms = body.bathrooms;
    if (body.maxGuests) data.maxGuests = body.maxGuests;
    if (body.amenities) data.amenities = body.amenities;
    if (body.neighbourhood !== undefined)
      data.neighbourhood = body.neighbourhood.trim() || null;
    if (body.city) data.city = body.city.trim();
    if (body.currency) data.currency = body.currency.toUpperCase();
    if (body.basePrice != null) {
      data.basePrice = body.priceInMinor
        ? Math.round(body.basePrice)
        : Math.round(body.basePrice * 100);
    }
    if (body.cleaningFee != null) {
      data.cleaningFee = body.priceInMinor
        ? Math.round(body.cleaningFee)
        : Math.round(body.cleaningFee * 100);
    }

    const listing = await prisma.listing.update({
      where: { id },
      data,
    });
    return NextResponse.json({ listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
