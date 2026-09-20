import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import { slugifyTitle } from "@/lib/agency";
import { parseListingsCsv } from "@/lib/csv-listings";

export const runtime = "nodejs";

const schema = z.object({
  csv: z.string().min(10),
  /** If true, create LIVE rows as LIVE; default keeps CSV status but caps LIVE unless goLive */
  forceDraft: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const { rows, errors } = parseListingsCsv(body.csv);

    if (!rows.length) {
      return NextResponse.json(
        { error: errors[0] || "No valid rows", errors },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.listing.create({
          data: {
            hostId: workspaceHostId(host),
            kind: "STAY",
            status: body.forceDraft ? "DRAFT" : row.status,
            title: row.title,
            slug: slugifyTitle(row.title),
            description: row.description,
            city: row.city,
            country: row.country,
            neighbourhood: row.neighbourhood || null,
            timezone: "Africa/Lagos",
            currency: row.currency,
            basePrice: Math.round(row.basePrice * 100),
            cleaningFee: Math.round(row.cleaningFee * 100),
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            maxGuests: row.maxGuests,
            amenities: row.amenities,
            sourcePlatform: "csv",
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      imported: created.length,
      listings: created.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
      })),
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "CSV import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
