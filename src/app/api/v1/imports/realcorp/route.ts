import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";
import {
  fetchRealcorpUnits,
  parseRealcorpUnits,
  realcorpPublishesNew,
  upsertRealcorpUnits,
} from "@/lib/sources/realcorp";

export const runtime = "nodejs";

const unitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  neighbourhood: z.string().optional(),
  area: z.string().optional(),
  currency: z.string().optional(),
  nightlyMinor: z.number().optional(),
  nightlyPrice: z.number().optional(),
  price: z.number().optional(),
  basePrice: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  maxGuests: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  icalUrl: z.string().optional(),
  blocks: z
    .array(
      z.object({
        start: z.string(),
        end: z.string(),
        summary: z.string().optional(),
      }),
    )
    .optional(),
});

const schema = z.object({
  tenantId: z.string().optional(),
  useSourcePrice: z.boolean().optional(),
  /** Percent, e.g. 10 = 10%. Stored as basis points. */
  markupPercent: z.number().min(0).max(200).optional(),
  /** Token Realcorp showed this tenant after they turned Pellows on. */
  accessToken: z.string().min(8).optional(),
  /** Realcorp can push units here instead of us pulling. */
  units: z.array(unitSchema).optional(),
});

async function saveLink(
  hostId: string,
  data: {
    externalTenantId?: string;
    accessToken?: string;
    useSourcePrice: boolean;
    markupBps: number;
    lastSyncedAt?: Date;
    lastError?: string | null;
  },
) {
  return prisma.sourceLink.upsert({
    where: { hostId_provider: { hostId, provider: "realcorp" } },
    create: { hostId, provider: "realcorp", ...data },
    update: data,
  });
}

export async function GET() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const hostId = workspaceHostId(host);
  const link = await prisma.sourceLink.findUnique({
    where: { hostId_provider: { hostId, provider: "realcorp" } },
  });
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.REALCORP_API_BASE),
    link: link
      ? {
          tenantId: link.externalTenantId,
          connected: Boolean(link.accessToken),
          useSourcePrice: link.useSourcePrice,
          markupPercent: link.markupBps / 100,
          lastSyncedAt: link.lastSyncedAt,
          lastError: link.lastError,
        }
      : null,
  });
}

/**
 * Save the agency's Realcorp price policy, then pull units
 * (or accept a push of the same JSON). Drafts only — host publishes.
 */
export async function POST(request: Request) {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const hostId = workspaceHostId(host);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const body = parsed.data;
  const useSourcePrice = body.useSourcePrice !== false;
  const markupBps = Math.round((body.markupPercent ?? 0) * 100);
  const existing = await prisma.sourceLink.findUnique({
    where: { hostId_provider: { hostId, provider: "realcorp" } },
  });
  const accessToken = body.accessToken?.trim() || existing?.accessToken || "";

  try {
    let units = body.units ? parseRealcorpUnits(body.units) : [];
    let pulled = false;

    if (!units.length) {
      const remote = await fetchRealcorpUnits({
        tenantId: body.tenantId,
        accessToken,
      });
      if (!remote.configured) {
        await saveLink(hostId, {
          externalTenantId: body.tenantId,
          ...(body.accessToken ? { accessToken: body.accessToken.trim() } : {}),
          useSourcePrice,
          markupBps,
          lastError: accessToken
            ? "Waiting on REALCORP_API_BASE"
            : "This Realcorp workspace has not connected. Turn Pellows on inside Realcorp and paste the connection token.",
        });
        return NextResponse.json({
          ok: true,
          status: "saved_pending_api",
          message: accessToken
            ? "Price policy saved. Pellows does not have the Realcorp base URL yet."
            : "Saved. Nothing was pulled. A Realcorp tenant is listed on Pellows only after that workspace turns Pellows on and you paste their connection token.",
        });
      }
      units = remote.units;
      pulled = true;
    }

    const result = await upsertRealcorpUnits({
      hostId,
      units,
      policy: { useSourcePrice, markupBps },
      publishNew: await realcorpPublishesNew(hostId),
    });
    await saveLink(hostId, {
      externalTenantId: body.tenantId,
      ...(body.accessToken ? { accessToken: body.accessToken.trim() } : {}),
      useSourcePrice,
      markupBps,
      lastSyncedAt: new Date(),
      lastError: null,
    });

    return NextResponse.json({
      ok: true,
      status: pulled ? "pulled" : "pushed",
      ...result,
      useSourcePrice,
      markupPercent: markupBps / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Realcorp sync failed";
    const denied = (err as { status?: number }).status === 401;
    if (denied) {
      await prisma.listing.updateMany({
        where: { hostId, sourcePlatform: "realcorp", status: "LIVE" },
        data: { status: "PAUSED" },
      });
    }
    await saveLink(hostId, {
      externalTenantId: body.tenantId,
      ...(body.accessToken ? { accessToken: body.accessToken.trim() } : {}),
      useSourcePrice,
      markupBps,
      lastError: message.slice(0, 300),
    }).catch(() => undefined);
    return NextResponse.json(
      {
        error: denied
          ? "Realcorp refused this workspace. Listings were paused. They need to turn Pellows on again."
          : message,
      },
      { status: denied ? 401 : 502 },
    );
  }
}
