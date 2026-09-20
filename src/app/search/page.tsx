"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LAGOS_AREAS } from "@/lib/agency";

type Hit = {
  id: string;
  slug?: string;
  kind: string;
  title: string;
  city: string;
  country: string;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number | null;
  tourUrl: string | null;
  neighbourhood: string | null;
  amenities: string[];
};

type Facets = {
  neighbourhoods: { value: string; count: number }[];
  bedrooms: { value: number; count: number }[];
  amenities: { value: string; count: number }[];
  priceBands: {
    id: string;
    label: string;
    min: number;
    max: number | null;
    count: number;
  }[];
};

function formatMoney(amount: number, currency: string) {
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

const ease = [0.22, 1, 0.36, 1] as const;

export default function SearchPage() {
  const [city, setCity] = useState("Lagos");
  const [checkIn, setCheckIn] = useState("2026-12-20");
  const [checkOut, setCheckOut] = useState("2026-12-27");
  const [guests, setGuests] = useState(4);
  const [neighbourhood, setNeighbourhood] = useState("");
  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [priceBand, setPriceBand] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [results, setResults] = useState<Hit[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    params.set("kind", "STAY");
    if (neighbourhood) params.set("neighbourhood", neighbourhood);
    if (bedrooms !== "") params.set("bedrooms", String(bedrooms));
    if (amenities.length) params.set("amenities", amenities.join(","));
    if (priceBand && facets) {
      const band = facets.priceBands.find((b) => b.id === priceBand);
      if (band) {
        params.set("minPrice", String(band.min));
        if (band.max != null) params.set("maxPrice", String(band.max));
      }
    }
    try {
      const res = await fetch(`/api/v1/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
      setFacets(data.facets ?? null);
      setTookMs(data.tookMs ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    city,
    checkIn,
    checkOut,
    guests,
    neighbourhood,
    bedrooms,
    amenities,
    priceBand,
    facets,
  ]);

  useEffect(() => {
    void runSearch();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAmenity(id: string) {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  const areaOptions =
    facets?.neighbourhoods.map((n) => n.value) ??
    (LAGOS_AREAS.filter((a) => a !== "Other") as unknown as string[]);

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-[var(--content-max)]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Detty December · inventory
          </p>
          <h1 className="font-display mt-3 text-heading-lg text-[var(--ink)]">
            Search
          </h1>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--muted)]">
            Ranked by area, amenities, price, freshness. Same API as WhatsApp.{" "}
            <Link
              href="/chat"
              className="text-[var(--sea)] underline-offset-2 hover:underline"
            >
              Try the chat agent →
            </Link>
          </p>
        </motion.div>

        <motion.div
          className="mt-10 rounded-[var(--radius-panel)] surface-frost p-5 md:p-7"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease }}
        >
          <div className="grid gap-4 md:grid-cols-5">
            <label className="md:col-span-2">
              <span className="auth-label">City</span>
              <input
                className="auth-input mt-2"
                placeholder="Lagos, Lekki, Abuja…"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void runSearch()}
              />
            </label>
            <label>
              <span className="auth-label">Check-in</span>
              <input
                type="date"
                className="auth-input mt-2"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </label>
            <label>
              <span className="auth-label">Check-out</span>
              <input
                type="date"
                className="auth-input mt-2"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </label>
            <label>
              <span className="auth-label">Guests</span>
              <input
                type="number"
                min={1}
                className="auth-input mt-2"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
              />
            </label>
          </div>

          <div className="mt-6">
            <p className="auth-label">Area</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNeighbourhood("")}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  !neighbourhood
                    ? "bg-[var(--sea)] text-white"
                    : "border border-black/10 text-[var(--ink)]"
                }`}
              >
                Any
              </button>
              {areaOptions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setNeighbourhood(neighbourhood === a ? "" : a)
                  }
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    neighbourhood === a
                      ? "bg-[var(--sea)] text-white"
                      : "border border-black/10 text-[var(--ink)]"
                  }`}
                >
                  {a}
                  {facets?.neighbourhoods.find((n) => n.value === a)
                    ? ` (${facets.neighbourhoods.find((n) => n.value === a)!.count})`
                    : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="auth-label">Beds</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBedrooms("")}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    bedrooms === ""
                      ? "bg-[var(--sea)] text-white"
                      : "border border-black/10"
                  }`}
                >
                  Any
                </button>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBedrooms(n)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      bedrooms === n
                        ? "bg-[var(--sea)] text-white"
                        : "border border-black/10"
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="auth-label">Price / night</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPriceBand("")}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    !priceBand
                      ? "bg-[var(--sea)] text-white"
                      : "border border-black/10"
                  }`}
                >
                  Any
                </button>
                {(facets?.priceBands ?? []).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setPriceBand(priceBand === b.id ? "" : b.id)
                    }
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      priceBand === b.id
                        ? "bg-[var(--sea)] text-white"
                        : "border border-black/10"
                    }`}
                  >
                    {b.label} ({b.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {facets && facets.amenities.length > 0 && (
            <div className="mt-5">
              <p className="auth-label">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {facets.amenities.slice(0, 8).map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleAmenity(a.value)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      amenities.includes(a.value)
                        ? "bg-[var(--sea)] text-white"
                        : "border border-black/10"
                    }`}
                  >
                    {a.value} ({a.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={loading}
              className="btn-pill btn-primary disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search stays"}
            </button>
            {tookMs != null && (
              <p className="text-[0.8125rem] text-[var(--muted)]">
                {results.length} result{results.length === 1 ? "" : "s"} ·{" "}
                <span className="tabular-nums text-[var(--ink)]">{tookMs}ms</span>
              </p>
            )}
          </div>
        </motion.div>

        {error && (
          <div
            className="mt-6 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
            role="alert"
          >
            {error}
          </div>
        )}

        <ul className="mt-10 space-y-3">
          {results.map((hit, i) => {
            const qs = new URLSearchParams({
              checkIn,
              checkOut,
              guests: String(guests),
            });
            return (
              <motion.li
                key={hit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease }}
                className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)]/80 px-5 py-5 md:px-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-[1.35rem] font-medium tracking-[-0.02em]">
                    {hit.title}
                  </h2>
                  <p className="text-[0.9375rem] font-medium tabular-nums">
                    {formatMoney(hit.basePrice, hit.currency)}
                    <span className="font-normal text-[var(--muted)]">
                      {" "}
                      / night
                    </span>
                  </p>
                </div>
                <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
                  {[hit.neighbourhood, hit.city, hit.country]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {hit.bedrooms != null ? `${hit.bedrooms} bed · ` : ""}
                  up to {hit.maxGuests} guests
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/stays/${hit.slug ?? hit.id}`}
                    className="btn-pill btn-ghost text-[0.8125rem]"
                  >
                    View
                  </Link>
                  <Link
                    href={`/book/${hit.id}?${qs}`}
                    className="btn-pill btn-primary text-[0.8125rem]"
                  >
                    Book
                  </Link>
                  {hit.tourUrl ? (
                    <a
                      href={hit.tourUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill btn-ghost text-[0.8125rem]"
                    >
                      Tour
                    </a>
                  ) : null}
                </div>
              </motion.li>
            );
          })}
        </ul>

        {searched && !loading && !error && results.length === 0 && (
          <p className="mt-10 text-[0.9375rem] text-[var(--muted)]">
            Nothing matched. Try Lagos, another area, or different dates.
          </p>
        )}
      </div>
    </section>
  );
}
