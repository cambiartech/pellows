"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

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
};

type PayMethod = "CARD" | "BANK_RAIL" | "CRYPTO";

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

function nightsBetween(a: string, b: string) {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export default function BookClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const listingId = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [guests, setGuests] = useState(Number(searchParams.get("guests") || 2));
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [method, setMethod] = useState<PayMethod>("BANK_RAIL");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    bookingId: string;
    paymentIntentId: string;
    total: number;
    currency: string;
    instructions: Record<string, unknown>;
    status: string;
  } | null>(null);

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

      const payRes = await fetch("/api/v1/payments/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookData.booking.id,
          method,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "Payment failed");

      const confRes = await fetch("/api/v1/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: payData.paymentIntent.id,
          devConfirm: true,
        }),
      });
      const confData = await confRes.json();
      if (!confRes.ok) throw new Error(confData.error || "Confirm failed");

      setDone({
        bookingId: bookData.booking.id,
        paymentIntentId: payData.paymentIntent.id,
        total: bookData.booking.total,
        currency: bookData.booking.currency,
        instructions: payData.paymentIntent.instructions,
        status: confData.paymentIntent.booking.status,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

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

        {listing && !done && (
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

              <div>
                <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  Pay with
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["BANK_RAIL", "Bank"],
                      ["CARD", "Card"],
                      ["CRYPTO", "Crypto"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      className={`rounded-[var(--radius-pill)] px-4 py-2 text-[0.8125rem] font-medium ${
                        method === value
                          ? "bg-[var(--sea)] text-[#f7f4ee]"
                          : "border border-[var(--hairline)] text-[var(--ink-soft)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {estimate && (
                <p className="text-[0.9375rem] text-[var(--ink)]">
                  {estimate.nights} night{estimate.nights === 1 ? "" : "s"} ·{" "}
                  {money(estimate.total, listing.currency)} incl. cleaning
                </p>
              )}

              {error && <p className="text-sm text-[#9a4030]">{error}</p>}

              <button
                type="button"
                disabled={busy || !checkIn || !checkOut || !guestName.trim()}
                onClick={onBook}
                className="btn-pill btn-primary disabled:opacity-50"
              >
                {busy ? "Booking…" : "Hold & pay"}
              </button>
              <p className="text-[0.75rem] text-[var(--muted)]">
                Launch mode confirms payment after intent (processor webhooks
                next). Calendar hard-blocks on confirm.
              </p>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            className="mt-8 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--foam)] p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--sea)]">
              Confirmed
            </p>
            <h2 className="font-display mt-2 text-[1.75rem] font-medium tracking-[-0.02em]">
              You&apos;re booked
            </h2>
            <p className="mt-3 text-[0.9375rem] text-[var(--ink-soft)]">
              Status <strong>{done.status}</strong> ·{" "}
              {money(done.total, done.currency)}
            </p>
            <p className="mt-2 font-mono text-[0.75rem] text-[var(--muted)]">
              booking {done.bookingId}
            </p>
            <pre className="mt-4 overflow-x-auto rounded-[var(--radius-ui)] bg-white/70 p-3 text-[0.75rem] text-[var(--ink-soft)]">
              {JSON.stringify(done.instructions, null, 2)}
            </pre>
            <Link
              href="/search"
              className="btn-pill btn-primary mt-6 inline-flex"
            >
              Back to search
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
