import { prisma } from "./db";
import { hashPassword } from "./agency-auth";

type ListingSeed = {
  title: string;
  slug: string;
  description: string;
  city: string;
  country: string;
  neighbourhood?: string;
  timezone: string;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  photoUrls?: string[];
  tourUrl?: string;
  lat?: number;
  lng?: number;
  kind?: "STAY" | "EXPERIENCE";
  priceUnit?: string;
};

const LISTINGS: ListingSeed[] = [
  {
    title: "VI Penthouse — skyline + generator",
    slug: "vi-penthouse-detty",
    description:
      "Detty December ready. Victoria Island penthouse with 24/7 power, security, and room for the crew.",
    city: "Lagos",
    country: "Nigeria",
    neighbourhood: "Victoria Island",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 45000000,
    cleaningFee: 5000000,
    bedrooms: 3,
    bathrooms: 3.5,
    maxGuests: 6,
    amenities: ["wifi", "generator", "security", "parking", "ac", "concierge"],
    photoUrls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3be61?w=800&q=80",
    ],
    lat: 6.4281,
    lng: 3.4219,
  },
  {
    title: "Lekki Phase 1 — pool villa shortlet",
    slug: "lekki-pool-villa-detty",
    description:
      "Private pool villa for Detty week. Close to the express and nightlife.",
    city: "Lagos",
    country: "Nigeria",
    neighbourhood: "Lekki Phase 1",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 38000000,
    cleaningFee: 4000000,
    bedrooms: 4,
    bathrooms: 4,
    maxGuests: 8,
    amenities: ["wifi", "pool", "generator", "security", "parking", "bbq"],
    photoUrls: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    ],
    lat: 6.4474,
    lng: 3.4721,
  },
  {
    title: "Ikoyi shortlet — sky terrace",
    slug: "ikoyi-sky-terrace",
    description: "High-floor shortlet with generator backup and concierge.",
    city: "Lagos",
    country: "Nigeria",
    neighbourhood: "Ikoyi",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 18500000,
    cleaningFee: 2500000,
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 6,
    amenities: ["wifi", "generator", "security", "parking"],
    photoUrls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    ],
    lat: 6.4541,
    lng: 3.4358,
  },
  {
    title: "Oniru beach apartment — 2BR",
    slug: "oniru-beach-2br",
    description: "Steps from the shoreline. Ideal Detty base for 2–4 guests.",
    city: "Lagos",
    country: "Nigeria",
    neighbourhood: "Oniru",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 22000000,
    cleaningFee: 3000000,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    amenities: ["wifi", "ac", "generator", "parking"],
    photoUrls: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    ],
    lat: 6.4302,
    lng: 3.4451,
  },
  {
    title: "Yaba loft — creatives & remote work",
    slug: "yaba-creative-loft",
    description: "Bright loft near tech hubs. Solid for longer Detty stays.",
    city: "Lagos",
    country: "Nigeria",
    neighbourhood: "Yaba",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 9500000,
    cleaningFee: 1500000,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    amenities: ["wifi", "workspace", "ac", "generator"],
    photoUrls: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    ],
    lat: 6.5095,
    lng: 3.3711,
  },
  {
    title: "Abuja Maitama — executive suite",
    slug: "maitama-executive-suite",
    description: "Quiet executive suite for capital trips around peak season.",
    city: "Abuja",
    country: "Nigeria",
    neighbourhood: "Maitama",
    timezone: "Africa/Lagos",
    currency: "NGN",
    basePrice: 28000000,
    cleaningFee: 3500000,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    amenities: ["wifi", "security", "parking", "ac", "generator"],
    photoUrls: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
    ],
    lat: 9.0882,
    lng: 7.4922,
  },
  {
    title: "Coral House — 2BR beach villa",
    slug: "coral-house-barbados",
    description:
      "Open-air villa steps from the Caribbean. Winter sun escape.",
    city: "Holetown",
    country: "Barbados",
    neighbourhood: "West Coast",
    timezone: "America/Barbados",
    currency: "USD",
    basePrice: 28000,
    cleaningFee: 7500,
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    amenities: ["wifi", "pool", "ac", "kitchen"],
    photoUrls: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
    ],
    tourUrl: "https://my.matterport.com/show/?m=demo",
    lat: 13.1867,
    lng: -59.6381,
  },
  {
    title: "Polanco loft with skyline view",
    slug: "polanco-loft-cdmx",
    description: "Design loft in Mexico City. Walk to parks and dining.",
    city: "Mexico City",
    country: "Mexico",
    neighbourhood: "Polanco",
    timezone: "America/Mexico_City",
    currency: "MXN",
    basePrice: 320000,
    cleaningFee: 45000,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    amenities: ["wifi", "workspace", "elevator"],
    photoUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
    ],
    lat: 19.4337,
    lng: -99.1945,
  },
  {
    title: "Sunset catamaran — 3 hours",
    slug: "barbados-sunset-sail",
    description: "Skippered sail with drinks. Per-person experience.",
    city: "Bridgetown",
    country: "Barbados",
    timezone: "America/Barbados",
    currency: "USD",
    basePrice: 9500,
    cleaningFee: 0,
    bedrooms: 0,
    bathrooms: 0,
    maxGuests: 12,
    amenities: ["drinks", "captain"],
    kind: "EXPERIENCE",
    priceUnit: "PERSON",
  },
];

/** Wipe demo tables and re-seed LIVE inventory (safe for empty Neon). */
export async function seedDemoInventory() {
  await prisma.agentMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.paymentLedgerEntry.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.hostPayoutAccount.deleteMany();
  await prisma.agencySession.deleteMany();
  await prisma.host.deleteMany();
  await prisma.guest.deleteMany();

  const host = await prisma.host.create({
    data: {
      email: "host@pellows.demo",
      name: "Demo Host",
      businessName: "Pellows Demo Agency",
      phone: "+2348000000000",
      whatsapp: "+2348000000000",
      passwordHash: hashPassword("pellows123"),
      verified: true,
    },
  });

  const created = [];
  for (const item of LISTINGS) {
    created.push(
      await prisma.listing.create({
        data: {
          hostId: host.id,
          kind: item.kind ?? "STAY",
          status: "LIVE",
          title: item.title,
          slug: item.slug,
          description: item.description,
          city: item.city,
          country: item.country,
          neighbourhood: item.neighbourhood,
          timezone: item.timezone,
          currency: item.currency,
          basePrice: item.basePrice,
          cleaningFee: item.cleaningFee,
          priceUnit: item.priceUnit ?? "NIGHT",
          bedrooms: item.bedrooms || null,
          bathrooms: item.bathrooms || null,
          maxGuests: item.maxGuests,
          amenities: item.amenities,
          photoUrls: item.photoUrls ?? [],
          tourUrl: item.tourUrl,
          lat: item.lat,
          lng: item.lng,
        },
      }),
    );
  }

  const coral = created.find((l) => l.slug === "coral-house-barbados");
  if (coral) {
    await prisma.calendarBlock.create({
      data: {
        listingId: coral.id,
        startDate: new Date("2026-12-20T00:00:00.000Z"),
        endDate: new Date("2026-12-27T00:00:00.000Z"),
        source: "MANUAL",
        summary: "Owner block — peak week",
      },
    });
  }

  return {
    listings: created.length,
    hostEmail: host.email,
    hostPassword: "pellows123",
  };
}
