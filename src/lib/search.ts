import { prisma } from "@/lib/db";
import type { ListingKind, ListingStatus, Prisma } from "@/generated/prisma";

export type SearchInput = {
  q?: string;
  city?: string;
  country?: string;
  neighbourhood?: string;
  kind?: ListingKind;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string;
  guests?: number;
  bedrooms?: number;
  /** Inclusive min nightly in major units (e.g. NGN) */
  minPrice?: number;
  /** Inclusive max nightly in major units */
  maxPrice?: number;
  /** Amenity ids that must all be present */
  amenities?: string[];
  limit?: number;
};

export type SearchHit = {
  id: string;
  kind: ListingKind;
  title: string;
  slug: string;
  city: string;
  country: string;
  neighbourhood: string | null;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  priceUnit: string;
  maxGuests: number;
  bedrooms: number | null;
  tourUrl: string | null;
  photoUrls: string[];
  amenities: string[];
  updatedAt?: Date;
};

export type SearchFacets = {
  neighbourhoods: { value: string; count: number }[];
  bedrooms: { value: number; count: number }[];
  amenities: { value: string; count: number }[];
  priceBands: { id: string; label: string; min: number; max: number | null; count: number }[];
};

const AREA_ALIASES: Record<string, string> = {
  lekky: "Lekki",
  leki: "Lekki",
  vi: "Victoria Island",
  "v.i": "Victoria Island",
  "v.i.": "Victoria Island",
  victoria: "Victoria Island",
  ikoy: "Ikoyi",
  "island": "Victoria Island",
  ajah: "Ajah",
  yaba: "Yaba",
  ikeja: "Ikeja",
  oniru: "Oniru",
  surulere: "Surulere",
  "lagos island": "Lagos",
};

/** Expand typos / shorthand into canonical area or leave as-is. */
export function normalizeSearchText(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toLowerCase();
  return AREA_ALIASES[key] ?? trimmed;
}

function parseDate(value: string) {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

const PRICE_BANDS = [
  { id: "under150k", label: "Under ₦150k", min: 0, max: 150000 },
  { id: "150to250", label: "₦150k–250k", min: 150000, max: 250000 },
  { id: "250to400", label: "₦250k–400k", min: 250000, max: 400000 },
  { id: "400plus", label: "₦400k+", min: 400000, max: null as number | null },
];

function scoreHit(
  row: SearchHit & { updatedAt: Date },
  input: SearchInput,
): number {
  let score = 0;
  const area = (input.neighbourhood || input.q || "").toLowerCase();
  const neigh = (row.neighbourhood || "").toLowerCase();
  const city = row.city.toLowerCase();

  // Area match
  if (input.neighbourhood && neigh === input.neighbourhood.toLowerCase()) {
    score += 100;
  } else if (area && (neigh.includes(area) || city.includes(area))) {
    score += 60;
  }

  // Amenity vibe overlap
  const wanted = input.amenities ?? [];
  if (wanted.length) {
    const have = new Set(row.amenities.map((a) => a.toLowerCase()));
    const hits = wanted.filter((a) => have.has(a.toLowerCase())).length;
    score += hits * 12;
  } else if (row.amenities.length) {
    score += Math.min(row.amenities.length, 6) * 2;
  }

  // Prefer mid-ish prices slightly over extremes (still sorts cheaper via price tiebreak)
  const major = row.basePrice / 100;
  if (major >= 100000 && major <= 350000) score += 8;

  // Freshness
  const ageDays =
    (Date.now() - new Date(row.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) score += 15;
  else if (ageDays < 30) score += 8;

  return score;
}

/**
 * Fast inventory search — indexed filter + ranked sort.
 * Powers web, WhatsApp, and LLM channels.
 */
export async function searchListings(input: SearchInput): Promise<{
  tookMs: number;
  results: SearchHit[];
  facets: SearchFacets;
}> {
  const started = performance.now();
  const guests = input.guests ?? 1;
  const limit = Math.min(input.limit ?? 24, 50);

  const where: Prisma.ListingWhereInput = {
    status: "LIVE" satisfies ListingStatus,
    maxGuests: { gte: guests },
  };

  if (input.kind) where.kind = input.kind;
  if (input.city) {
    const city = normalizeSearchText(input.city) || input.city;
    where.city = { contains: city, mode: "insensitive" };
  }
  if (input.country) {
    where.country = { contains: input.country, mode: "insensitive" };
  }
  if (input.neighbourhood) {
    const area = normalizeSearchText(input.neighbourhood) || input.neighbourhood;
    where.neighbourhood = {
      contains: area,
      mode: "insensitive",
    };
  }
  if (input.bedrooms != null) {
    where.bedrooms = { gte: input.bedrooms };
  }
  if (input.minPrice != null || input.maxPrice != null) {
    where.basePrice = {};
    if (input.minPrice != null) {
      where.basePrice.gte = Math.round(input.minPrice * 100);
    }
    if (input.maxPrice != null) {
      where.basePrice.lte = Math.round(input.maxPrice * 100);
    }
  }
  if (input.amenities?.length) {
    where.amenities = { hasEvery: input.amenities };
  }
  if (input.q) {
    const q = normalizeSearchText(input.q) || input.q;
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { neighbourhood: { contains: q, mode: "insensitive" } },
    ];
  }

  if (input.checkIn && input.checkOut) {
    const checkIn = parseDate(input.checkIn);
    const checkOut = parseDate(input.checkOut);
    where.blocks = {
      none: {
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
    };
  }

  // Facet base: same city/country/kind/dates/guests, ignore price/area/amenity filters
  const facetWhere: Prisma.ListingWhereInput = {
    status: "LIVE",
    maxGuests: { gte: guests },
  };
  if (input.kind) facetWhere.kind = input.kind;
  if (input.city) {
    const city = normalizeSearchText(input.city) || input.city;
    facetWhere.city = { contains: city, mode: "insensitive" };
  }
  if (input.country) {
    facetWhere.country = { contains: input.country, mode: "insensitive" };
  }
  if (input.checkIn && input.checkOut) {
    const checkIn = parseDate(input.checkIn);
    const checkOut = parseDate(input.checkOut);
    facetWhere.blocks = {
      none: {
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
    };
  }

  const [rows, facetRows] = await Promise.all([
    prisma.listing.findMany({
      where,
      take: Math.min(limit * 4, 120),
      select: {
        id: true,
        kind: true,
        title: true,
        slug: true,
        city: true,
        country: true,
        neighbourhood: true,
        currency: true,
        basePrice: true,
        cleaningFee: true,
        priceUnit: true,
        maxGuests: true,
        bedrooms: true,
        tourUrl: true,
        photoUrls: true,
        amenities: true,
        updatedAt: true,
      },
    }),
    prisma.listing.findMany({
      where: facetWhere,
      select: {
        neighbourhood: true,
        bedrooms: true,
        amenities: true,
        basePrice: true,
      },
      take: 500,
    }),
  ]);

  const ranked = [...rows]
    .map((row) => ({
      row,
      score: scoreHit(row, input),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.row.basePrice !== b.row.basePrice) {
        return a.row.basePrice - b.row.basePrice;
      }
      return (
        new Date(b.row.updatedAt).getTime() - new Date(a.row.updatedAt).getTime()
      );
    })
    .slice(0, limit)
    .map(({ row }) => {
      const { updatedAt: _u, ...hit } = row;
      return hit;
    });

  const neighMap = new Map<string, number>();
  const bedMap = new Map<number, number>();
  const amenMap = new Map<string, number>();
  const bandCounts = PRICE_BANDS.map((b) => ({ ...b, count: 0 }));

  for (const r of facetRows) {
    if (r.neighbourhood) {
      neighMap.set(r.neighbourhood, (neighMap.get(r.neighbourhood) || 0) + 1);
    }
    if (r.bedrooms != null) {
      bedMap.set(r.bedrooms, (bedMap.get(r.bedrooms) || 0) + 1);
    }
    for (const a of r.amenities) {
      amenMap.set(a, (amenMap.get(a) || 0) + 1);
    }
    const major = r.basePrice / 100;
    for (const band of bandCounts) {
      if (major >= band.min && (band.max == null || major < band.max)) {
        band.count++;
        break;
      }
    }
  }

  const facets: SearchFacets = {
    neighbourhoods: [...neighMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    bedrooms: [...bedMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value - b.value),
    amenities: [...amenMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    priceBands: bandCounts.map((b) => ({
      id: b.id,
      label: b.label,
      min: b.min,
      max: b.max,
      count: b.count,
    })),
  };

  return {
    tookMs: Math.round(performance.now() - started),
    results: ranked,
    facets,
  };
}
