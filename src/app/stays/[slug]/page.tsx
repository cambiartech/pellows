import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

async function getLiveStay(slug: string) {
  return prisma.listing.findFirst({
    where: { slug, status: "LIVE" },
    include: {
      host: {
        select: {
          businessName: true,
          name: true,
          verified: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getLiveStay(slug);
  if (!listing) return { title: "Stay not found" };

  const place = [listing.neighbourhood, listing.city].filter(Boolean).join(", ");
  const title = `${listing.title} · ${place}`;
  const description =
    listing.description.slice(0, 160) ||
    `Shortlet in ${place}. Book on Pellows — web, WhatsApp, or AI agents.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: listing.photoUrls[0] ? [{ url: listing.photoUrls[0] }] : undefined,
    },
    alternates: {
      canonical: `/stays/${listing.slug}`,
    },
  };
}

export default async function StayPage({ params }: Params) {
  const { slug } = await params;
  const listing = await getLiveStay(slug);
  if (!listing) notFound();

  const place = [listing.neighbourhood, listing.city, listing.country]
    .filter(Boolean)
    .join(" · ");
  const hostLabel = listing.host.businessName || listing.host.name;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: listing.description,
    url: `${base}/stays/${listing.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.neighbourhood || listing.city,
      addressRegion: listing.city,
      addressCountry: listing.country,
    },
    ...(listing.lat != null && listing.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          },
        }
      : {}),
    amenityFeature: listing.amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
    })),
    makesOffer: {
      "@type": "Offer",
      priceCurrency: listing.currency,
      price: (listing.basePrice / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${base}/book/${listing.id}`,
    },
  };

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[var(--content-max)]">
        <Link
          href="/search"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Search
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            {listing.photoUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.photoUrls[0]}
                alt=""
                className="aspect-[16/10] w-full rounded-[var(--radius-panel)] object-cover"
              />
            ) : (
              <div
                className="flex aspect-[16/10] w-full items-end rounded-[var(--radius-panel)] bg-gradient-to-br from-[var(--sea)] to-[#062e2c] p-8"
                aria-hidden
              >
                <p className="font-display text-2xl text-[#f3efe6]/90">
                  {listing.neighbourhood || listing.city}
                </p>
              </div>
            )}

            <p className="mt-8 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
              Shortlet · {listing.city}
            </p>
            <h1 className="font-display mt-2 text-heading-lg tracking-[-0.03em]">
              {listing.title}
            </h1>
            <p className="mt-2 text-[var(--muted)]">{place}</p>

            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
              {listing.description}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Beds", listing.bedrooms ?? "—"],
                ["Baths", listing.bathrooms ?? "—"],
                ["Guests", listing.maxGuests],
                ["Host", hostLabel],
              ].map(([k, v]) => (
                <div
                  key={String(k)}
                  className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/80 px-4 py-3"
                >
                  <dt className="text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">
                    {k}
                  </dt>
                  <dd className="mt-1 font-medium text-[var(--ink)]">{v}</dd>
                </div>
              ))}
            </dl>

            {listing.amenities.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-xl">Amenities</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <li
                      key={a}
                      className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)]/90 p-6 lg:sticky lg:top-28">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              From
            </p>
            <p className="mt-1 font-display text-3xl font-medium tabular-nums">
              {money(listing.basePrice, listing.currency)}
              <span className="text-base font-normal text-[var(--muted)]">
                {" "}
                / night
              </span>
            </p>
            {listing.cleaningFee > 0 && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                + {money(listing.cleaningFee, listing.currency)} cleaning
              </p>
            )}
            {listing.host.verified && (
              <p className="mt-3 text-sm font-medium text-[var(--sea)]">
                Verified agency
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/book/${listing.id}`}
                className="btn-pill btn-primary w-full text-center"
              >
                Book this stay
              </Link>
              <Link
                href="/chat"
                className="btn-pill btn-ghost w-full text-center"
              >
                Ask in chat
              </Link>
              {listing.tourUrl ? (
                <a
                  href={listing.tourUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill btn-ghost w-full text-center"
                >
                  Virtual tour
                </a>
              ) : null}
            </div>
            <p className="mt-5 text-sm text-[var(--muted)]">
              Pay in-app: card, bank, or crypto. Calendar locks on confirm.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
