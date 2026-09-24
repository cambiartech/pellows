import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { slugifyTitle } from "@/lib/agency";
import { guestNightlyPrice } from "@/lib/sources/price";

/**
 * Contract Realcorp can implement, or push the same JSON to
 * POST /api/v1/imports/realcorp { units }.
 *
 * GET {REALCORP_API_BASE}/v1/shortlets/units?tenantId=
 * Authorization: Bearer <tenant access token>
 * The token is issued by Realcorp when that tenant opts in.
 * It must not be able to read any other tenant.
 */
export type RealcorpUnit = {
  id: string;
  title: string;
  description?: string;
  city?: string;
  country?: string;
  neighbourhood?: string;
  currency?: string;
  /** Minor units (kobo/cents). Preferred. */
  nightlyMinor?: number;
  /** Major units if nightlyMinor is absent (150000 = ₦150,000). */
  nightlyPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  amenities?: string[];
  photoUrls?: string[];
  icalUrl?: string;
  /** Absent means "do not touch busy dates". Empty array clears Realcorp blocks. */
  blocks?: { start: string; end: string; summary?: string }[];
  archived?: boolean;
};

export type PricePolicy = {
  useSourcePrice: boolean;
  markupBps: number;
};

function asUnit(raw: unknown): RealcorpUnit | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const id = String(u.id || u.unitId || u.realcorpUnitId || "").trim();
  const title = String(u.title || u.name || "").trim();
  if (!id || !title) return null;
  const nightlyMinor =
    typeof u.nightlyMinor === "number"
      ? u.nightlyMinor
      : typeof u.basePrice === "number" && u.basePrice > 10_000_000
        ? u.basePrice
        : undefined;
  const nightlyPrice =
    nightlyMinor == null && typeof u.nightlyPrice === "number"
      ? u.nightlyPrice
      : nightlyMinor == null && typeof u.price === "number"
        ? u.price
        : nightlyMinor == null && typeof u.basePrice === "number"
          ? u.basePrice
          : undefined;
  const photos = Array.isArray(u.photoUrls)
    ? u.photoUrls.filter((p): p is string => typeof p === "string")
    : Array.isArray(u.photos)
      ? u.photos.filter((p): p is string => typeof p === "string")
      : [];
  const amenities = Array.isArray(u.amenities)
    ? u.amenities.filter((a): a is string => typeof a === "string")
    : [];
  const blocks = Array.isArray(u.blocks)
    ? u.blocks.flatMap((b) => {
        if (!b || typeof b !== "object") return [];
        const row = b as { start?: string; end?: string; summary?: string };
        if (!row.start || !row.end) return [];
        return [{ start: row.start, end: row.end, summary: row.summary }];
      })
    : undefined;
  return {
    id,
    title,
    description: typeof u.description === "string" ? u.description : undefined,
    city: typeof u.city === "string" ? u.city : undefined,
    country: typeof u.country === "string" ? u.country : undefined,
    neighbourhood:
      typeof u.neighbourhood === "string"
        ? u.neighbourhood
        : typeof u.area === "string"
          ? u.area
          : undefined,
    currency: typeof u.currency === "string" ? u.currency : undefined,
    nightlyMinor,
    nightlyPrice,
    bedrooms: typeof u.bedrooms === "number" ? u.bedrooms : undefined,
    bathrooms: typeof u.bathrooms === "number" ? u.bathrooms : undefined,
    maxGuests: typeof u.maxGuests === "number" ? u.maxGuests : undefined,
    amenities,
    photoUrls: photos,
    icalUrl: typeof u.icalUrl === "string" ? u.icalUrl : undefined,
    blocks,
    archived: typeof u.archived === "boolean" ? u.archived : undefined,
  };
}

export function parseRealcorpUnits(payload: unknown): RealcorpUnit[] {
  const root = payload as { units?: unknown; data?: unknown } | unknown[];
  const list = Array.isArray(root)
    ? root
    : Array.isArray(root?.units)
      ? root.units
      : Array.isArray(root?.data)
        ? root.data
        : [];
  return list.flatMap((row) => {
    const unit = asUnit(row);
    return unit ? [unit] : [];
  });
}

function sourceMinor(unit: RealcorpUnit) {
  if (typeof unit.nightlyMinor === "number") return Math.round(unit.nightlyMinor);
  if (typeof unit.nightlyPrice === "number") return Math.round(unit.nightlyPrice * 100);
  return 0;
}

export async function fetchRealcorpUnits(input: {
  tenantId?: string;
  accessToken?: string | null;
  /** Catch-up only. Guest chat must not call this. */
  updatedSince?: Date | null;
}) {
  const base = process.env.REALCORP_API_BASE?.replace(/\/$/, "");
  const key = input.accessToken?.trim();
  if (!base || !key) {
    return { configured: false as const, units: [] as RealcorpUnit[] };
  }
  const url = new URL(`${base}/v1/shortlets/units`);
  if (input.tenantId) url.searchParams.set("tenantId", input.tenantId);
  if (input.updatedSince) {
    url.searchParams.set("updatedSince", input.updatedSince.toISOString());
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Realcorp ${res.status}: ${text.slice(0, 160)}`) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
  const json = await res.json();
  return { configured: true as const, units: parseRealcorpUnits(json) };
}

/** True after this agency has pressed Go LIVE on at least one Realcorp room. */
export async function realcorpPublishesNew(hostId: string) {
  const live = await prisma.listing.findFirst({
    where: { hostId, sourcePlatform: "realcorp", status: "LIVE" },
    select: { id: true },
  });
  return Boolean(live);
}

/**
 * Write the local copy. New rooms are drafts until the workspace has a live
 * room; after that, new rooms publish. Updates keep the status the agency set,
 * except an archived unit leaves search.
 */
export async function upsertRealcorpUnits(input: {
  hostId: string;
  units: RealcorpUnit[];
  policy: PricePolicy;
  publishNew?: boolean;
}) {
  let created = 0;
  let updated = 0;
  let published = 0;
  let archived = 0;

  for (const unit of input.units) {
    const minor = sourceMinor(unit);
    const basePrice = guestNightlyPrice({
      sourceMinor: minor,
      useSourcePrice: input.policy.useSourcePrice,
      markupBps: input.policy.markupBps,
    });
    const data = {
      title: unit.title,
      description: unit.description || unit.title,
      city: unit.city || "Lagos",
      country: unit.country || "NG",
      neighbourhood: unit.neighbourhood || null,
      currency: (unit.currency || "NGN").toUpperCase(),
      basePrice,
      sourcePrice: minor,
      bedrooms: unit.bedrooms ?? null,
      bathrooms: unit.bathrooms ?? null,
      maxGuests: unit.maxGuests ?? 2,
      amenities: unit.amenities || [],
      photoUrls: unit.photoUrls || [],
      icalUrl: unit.icalUrl || null,
      sourcePlatform: "realcorp",
      realcorpUnitId: unit.id,
    };

    const existing = await prisma.listing.findFirst({
      where: { hostId: input.hostId, realcorpUnitId: unit.id },
    });

    const nextStatus =
      unit.archived === true
        ? ("ARCHIVED" as const)
        : !existing
          ? input.publishNew
            ? ("LIVE" as const)
            : ("DRAFT" as const)
          : unit.archived === false && existing.status === "ARCHIVED"
            ? input.publishNew
              ? ("LIVE" as const)
              : ("DRAFT" as const)
            : undefined;

    const listing = existing
      ? await prisma.listing.update({
          where: { id: existing.id },
          data: nextStatus ? { ...data, status: nextStatus } : data,
        })
      : await prisma.listing.create({
          data: {
            ...data,
            hostId: input.hostId,
            slug: slugifyTitle(unit.title),
            status: nextStatus || "DRAFT",
          },
        });

    if (existing) updated += 1;
    else created += 1;
    if (!existing && listing.status === "LIVE") published += 1;
    if (unit.archived) archived += 1;

    if (unit.blocks) {
      await prisma.calendarBlock.deleteMany({
        where: { listingId: listing.id, source: "REALCORP" },
      });
      if (unit.blocks.length) {
        await prisma.calendarBlock.createMany({
          data: unit.blocks.map((b) => ({
            listingId: listing.id,
            startDate: new Date(`${b.start}T00:00:00.000Z`),
            endDate: new Date(`${b.end}T00:00:00.000Z`),
            source: "REALCORP" as const,
            summary: (b.summary || "Realcorp busy").slice(0, 190),
          })),
        });
      }
    }
  }

  return { created, updated, published, archived, total: input.units.length };
}

export function verifyRealcorpSignature(rawBody: string, header: string | null) {
  const secret = process.env.REALCORP_WEBHOOK_SECRET?.trim();
  if (!secret) return "unconfigured" as const;
  const got = (header || "").replace(/^sha256=/i, "").trim();
  if (!got) return "bad" as const;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(got, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return "bad" as const;
    return timingSafeEqual(a, b) ? ("ok" as const) : ("bad" as const);
  } catch {
    return "bad" as const;
  }
}

const REALCORP_EVENTS = new Set(["unit.upserted", "unit.archived", "block.changed"]);

function rawUnitId(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const u = raw as Record<string, unknown>;
  return String(u.id || u.unitId || u.realcorpUnitId || "").trim();
}

function rawBlocks(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const blocks = (raw as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return undefined;
  return blocks.flatMap((b) => {
    if (!b || typeof b !== "object") return [];
    const row = b as { start?: string; end?: string; summary?: string };
    if (!row.start || !row.end) return [];
    return [{ start: row.start, end: row.end, summary: row.summary }];
  });
}

/**
 * Apply one signed Realcorp change onto our copy. Does not call their API.
 * A repeated eventId is ignored.
 */
export async function applyRealcorpEvent(input: {
  eventId: string;
  tenantId: string;
  event: string;
  unit: unknown;
}) {
  if (!REALCORP_EVENTS.has(input.event)) {
    return { ok: false as const, error: "unknown_event" };
  }
  const seen = await prisma.realcorpEvent.findUnique({
    where: { eventId: input.eventId },
  });
  if (seen) return { ok: true as const, duplicate: true as const };

  const links = await prisma.sourceLink.findMany({
    where: {
      provider: "realcorp",
      externalTenantId: input.tenantId,
      accessToken: { not: null },
    },
  });
  if (!links.length) {
    return { ok: true as const, ignored: "tenant_not_connected" as const };
  }

  for (const link of links) {
    const publishNew = await realcorpPublishesNew(link.hostId);
    if (input.event === "unit.archived") {
      const id = rawUnitId(input.unit);
      if (!id) return { ok: false as const, error: "missing_unit_id" };
      await prisma.listing.updateMany({
        where: {
          hostId: link.hostId,
          realcorpUnitId: id,
          sourcePlatform: "realcorp",
        },
        data: { status: "ARCHIVED" },
      });
      continue;
    }
    const unit = asUnit(input.unit);
    if (!unit && input.event === "block.changed") {
      const id = rawUnitId(input.unit);
      const blocks = rawBlocks(input.unit);
      if (!id || !blocks) return { ok: false as const, error: "invalid_unit" };
      const listing = await prisma.listing.findFirst({
        where: {
          hostId: link.hostId,
          realcorpUnitId: id,
          sourcePlatform: "realcorp",
        },
      });
      if (listing) {
        await prisma.calendarBlock.deleteMany({
          where: { listingId: listing.id, source: "REALCORP" },
        });
        if (blocks.length) {
          await prisma.calendarBlock.createMany({
            data: blocks.map((b) => ({
              listingId: listing.id,
              startDate: new Date(`${b.start}T00:00:00.000Z`),
              endDate: new Date(`${b.end}T00:00:00.000Z`),
              source: "REALCORP" as const,
              summary: (b.summary || "Realcorp busy").slice(0, 190),
            })),
          });
        }
      }
      continue;
    }
    if (!unit) return { ok: false as const, error: "invalid_unit" };
    if (input.event === "unit.upserted" && unit.archived === undefined) {
      unit.archived = false;
    }
    await upsertRealcorpUnits({
      hostId: link.hostId,
      units: [unit],
      policy: {
        useSourcePrice: link.useSourcePrice,
        markupBps: link.markupBps,
      },
      publishNew,
    });
  }

  await prisma.realcorpEvent
    .create({ data: { eventId: input.eventId, tenantId: input.tenantId } })
    .catch(() => undefined);

  return { ok: true as const };
}

/** One opted-in tenant. Failures stay on that link. */
export async function syncRealcorpLink(link: {
  hostId: string;
  externalTenantId: string | null;
  accessToken: string | null;
  useSourcePrice: boolean;
  markupBps: number;
  lastSyncedAt: Date | null;
}) {
  const tenantId = link.externalTenantId?.trim();
  const accessToken = link.accessToken?.trim();
  if (!tenantId || !accessToken) {
    return { ok: false as const, error: "not_connected" };
  }
  try {
    const publishNew = await realcorpPublishesNew(link.hostId);
    const remote = await fetchRealcorpUnits({
      tenantId,
      accessToken,
      updatedSince: link.lastSyncedAt,
    });
    if (!remote.configured) {
      return { ok: false as const, error: "REALCORP_API_BASE is not set" };
    }
    const result = await upsertRealcorpUnits({
      hostId: link.hostId,
      units: remote.units,
      policy: {
        useSourcePrice: link.useSourcePrice,
        markupBps: link.markupBps,
      },
      publishNew,
    });
    await prisma.sourceLink.update({
      where: { hostId_provider: { hostId: link.hostId, provider: "realcorp" } },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
    return { ok: true as const, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Realcorp sync failed";
    const denied = (err as { status?: number }).status === 401;
    if (denied) {
      await prisma.listing.updateMany({
        where: { hostId: link.hostId, sourcePlatform: "realcorp", status: "LIVE" },
        data: { status: "PAUSED" },
      });
    }
    await prisma.sourceLink
      .update({
        where: { hostId_provider: { hostId: link.hostId, provider: "realcorp" } },
        data: { lastError: message.slice(0, 300) },
      })
      .catch(() => undefined);
    return { ok: false as const, error: message, denied };
  }
}
