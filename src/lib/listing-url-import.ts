/**
 * Best-effort public listing URL → draft fields.
 * Official Airbnb Homes / Booking Connectivity replace this when partner creds land.
 */

export type ListingUrlDraft = {
  title: string;
  description: string;
  city: string;
  country: string;
  neighbourhood?: string;
  sourcePlatform: "airbnb" | "booking" | "url";
  externalListingUrl: string;
  currency: string;
  basePrice: number;
  notes: string[];
};

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
    .slice(0, 80);
}

export function draftFromListingUrl(rawUrl: string): ListingUrlDraft {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid listing URL");
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const notes: string[] = [
    "Draft from URL — edit title, rate, and amenities before going LIVE.",
    "Photos & live rates need official partner API or manual upload.",
  ];

  // Airbnb: /rooms/123 or /rooms/123?…
  if (host.includes("airbnb.")) {
    const room = /\/rooms\/(\d+)/.exec(url.pathname);
    const slugBits = url.pathname.split("/").filter(Boolean);
    const titleHint = slugBits.find((s) => s !== "rooms" && !/^\d+$/.test(s));
    return {
      title: titleHint
        ? titleFromSlug(titleHint)
        : room
          ? `Airbnb listing ${room[1]}`
          : "Imported Airbnb stay",
      description:
        "Imported from Airbnb listing link. Confirm beds, guests, and nightly rate, then publish.",
      city: "Lagos",
      country: "Nigeria",
      sourcePlatform: "airbnb",
      externalListingUrl: url.toString(),
      currency: "NGN",
      basePrice: 150000,
      notes: [
        ...notes,
        room ? `Airbnb room id: ${room[1]}` : "Paste iCal from Airbnb calendar for busy dates.",
      ],
    };
  }

  // Booking.com hotel or apartment pages
  if (host.includes("booking.com")) {
    const path = url.pathname.replace(/\/$/, "");
    const last = path.split("/").filter(Boolean).pop() || "stay";
    const clean = last.replace(/\.([a-z]{2}(-[a-z]+)?)\.html$/i, "").replace(/\.html$/i, "");
    return {
      title: titleFromSlug(clean) || "Imported Booking.com stay",
      description:
        "Imported from Booking.com link. Confirm details and attach iCal for calendar sync.",
      city: "Lagos",
      country: "Nigeria",
      sourcePlatform: "booking",
      externalListingUrl: url.toString(),
      currency: "NGN",
      basePrice: 150000,
      notes: [
        ...notes,
        "Full Connectivity / Demand API sync when partner credentials are available.",
      ],
    };
  }

  return {
    title: "Imported listing",
    description: `Imported from ${host}. Fill in beds, rate, and area, then publish.`,
    city: "Lagos",
    country: "Nigeria",
    sourcePlatform: "url",
    externalListingUrl: url.toString(),
    currency: "NGN",
    basePrice: 150000,
    notes,
  };
}
