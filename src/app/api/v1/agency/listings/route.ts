import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  generateApiKey,
  getHostFromApiKey,
  getSessionHost,
  isOwner,
  workspaceHostId,
} from "@/lib/agency-auth";
import { slugifyTitle } from "@/lib/agency";

export const runtime = "nodejs";

async function resolveAgencyHost(request: Request) {
  const fromKey = await getHostFromApiKey(request.headers.get("authorization"));
  if (fromKey) return fromKey;
  return getSessionHost();
}

export async function GET(request: Request) {
  const host = await resolveAgencyHost(request);
  if (!host) {
    return NextResponse.json({ error: "Unauthorized — Bearer pel_… or session" }, { status: 401 });
  }
  const listings = await prisma.listing.findMany({
    where: { hostId: workspaceHostId(host) },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ listings });
}

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(8),
  city: z.string().default("Lagos"),
  country: z.string().default("Nigeria"),
  neighbourhood: z.string().optional(),
  currency: z.string().default("NGN"),
  basePrice: z.number().positive(),
  cleaningFee: z.number().min(0).default(0),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  maxGuests: z.number().int().min(1).default(2),
  amenities: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "LIVE", "PAUSED"]).default("DRAFT"),
});

export async function POST(request: Request) {
  try {
    const host = await resolveAgencyHost(request);
    if (!host) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = createSchema.parse(await request.json());
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
        timezone: "Africa/Lagos",
        currency: body.currency.toUpperCase(),
        basePrice: Math.round(body.basePrice * 100),
        cleaningFee: Math.round(body.cleaningFee * 100),
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        maxGuests: body.maxGuests,
        amenities: body.amenities,
        sourcePlatform: "api",
      },
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Rotate / create agency API key (session owner only). */
export async function PUT() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  if (!isOwner(host)) {
    return NextResponse.json({ error: "Only owners can manage API keys" }, { status: 403 });
  }
  const { raw, hash, prefix } = generateApiKey();
  await prisma.host.update({
    where: { id: host.id },
    data: { apiKeyHash: hash, apiKeyPrefix: prefix },
  });
  return NextResponse.json({
    apiKey: raw,
    prefix,
    note: "Copy now — shown once.",
  });
}
