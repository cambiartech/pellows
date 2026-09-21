"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { dualPriceLabel } from "@/lib/money";

type Listing = {
  id: string;
  title: string;
  city: string;
  country: string;
  neighbourhood: string | null;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  maxGuests: number;
  description: string;
  slug?: string;
};

function nightsBetween(a: string, b: string) {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export default function BookClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [guests, setGuests] = useState(Number(searchParams.get("guests") || 2));
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/listings/${listingId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Not found");
        setListing(data.listing);
      })
      .catch((e) => setError(e.message));
  }, [listingId]);

  const estimate = useMemo(() => {
    if (!listing || !checkIn || !checkOut) return null;
    const nights = nightsBetween(checkIn, checkOut);
    const subtotal = listing.basePrice * nights;
    const total = subtotal + listing.cleaningFee;
    return { nights, subtotal, total };
  }, [listing, checkIn, checkOut]);

  async function onBook() {
    if (!listing) return;
    setBusy(true);
    setError(null);
    try {
      const bookRes = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn,
          checkOut,
          guests,
          guestName,
          guestPhone: guestPhone || undefined,
          channel: "WEB",
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) throw new Error(bookData.error || "Hold failed");

      // Same funnel as WhatsApp: hold → CARD intent → /pay page
      const payRes = await fetch("/api/v1/payments/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookData.booking.id,
          method: "CARD",
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "Payment failed");

      router.push(`/pay/${payData.paymentIntent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
      setBusy(false);
    }
  }

  const totalLabel =
    listing && estimate
      ? dualPriceLabel(estimate.total, listing.currency)
      : null;

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/search"
          className="text-[0.8125rem] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Search
        </Link>

        {error && !listing && (
          <p className="mt-8 text-[#9a4030]">{error}</p>
        )}

        {listing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="mt-6 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Book · Detty ready
            </p>
            <h1 className="font-display mt-3 text-heading text-[var(--ink)]">
              {listing.title}
            </h1>
            <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">
              {[listing.neighbourhood, listing.city, listing.country]
                .filter(Boolean)
                .join(" · ")}{" "}
              · up to {listing.maxGuests} guests
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--ink-soft)]">
              {listing.description}
            </p>

            <div className="mt-8 space-y-4 rounded-[var(--radius-panel)] surface-frost p-5 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Check-in
                  </span>
                  <input
                    type="date"
                    className="field mt-1.5"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </label>
                <label>
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Check-out
                  </span>
                  <input
                    type="date"
                    className="field mt-1.5"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
                <label>
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Guests
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={listing.maxGuests}
                    className="field mt-1.5"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  />
                </label>
                <label>
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Your name
                  </span>
                  <input
                    className="field mt-1.5"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ada Okonkwo"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Phone (WhatsApp)
                  </span>
                  <input
                    className="field mt-1.5"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+234…"
                  />
                </label>
              </div>

              {estimate && totalLabel && (
                <p className="text-[0.9375rem] text-[var(--ink)]">
                  {estimate.nights} night{estimate.nights === 1 ? "" : "s"} ·{" "}
                  {totalLabel.usd || totalLabel.primary} incl. cleaning
                  {totalLabel.usd ? (
                    <span className="ml-1 text-[var(--muted)]">
                      ({totalLabel.primary})
                    </span>
                  ) : null}
                </p>
              )}

              {error && <p className="text-sm text-[#9a4030]">{error}</p>}

              <button
                type="button"
                disabled={busy || !checkIn || !checkOut || !guestName.trim()}
                onClick={() => void onBook()}
                className="btn-pill btn-primary disabled:opacity-50"
              >
                {busy ? "Holding…" : "Continue to pay"}
              </button>
              <p className="text-[0.75rem] text-[var(--muted)]">
                We hold your dates briefly. Pay on the next screen (card, bank,
                or crypto) — same flow as WhatsApp.
              </p>
              {listing.slug ? (
                <Link
                  href={`/stays/${listing.slug}`}
                  className="block text-[0.8125rem] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  ← Back to stay
                </Link>
              ) : null}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
