"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  status: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  checkIn: string;
  checkOut: string;
  total: number;
  currency: string;
  listing: { title: string; neighbourhood: string | null };
  latestPayment: { status: string; method: string } | null;
};

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

export default function HostBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const me = await fetch("/api/v1/auth/me");
    if (!me.ok) {
      router.replace("/login");
      return;
    }
    const res = await fetch("/api/v1/agency/bookings");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load");
      return;
    }
    setBookings(data.bookings ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-2xl">
        <Link href="/host" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Workspace
        </Link>
        <h1 className="font-display mt-4 text-heading">Booking inbox</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Holds, confirmed stays, and guest contact.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        )}

        <ul className="mt-8 space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/80 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-medium">{b.listing.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {b.checkIn} → {b.checkOut} · {b.guestName}
                    {b.guestPhone ? ` · ${b.guestPhone}` : ""}
                    {b.guestEmail ? ` · ${b.guestEmail}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide">
                    {b.status}
                  </span>
                  <p className="mt-2 text-sm font-medium">
                    {money(b.total, b.currency)}
                  </p>
                  {b.latestPayment && (
                    <p className="text-[0.7rem] text-[var(--muted)]">
                      {b.latestPayment.method} · {b.latestPayment.status}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!bookings.length && !error && (
          <p className="mt-10 text-center text-sm text-[var(--muted)]">
            No bookings yet — when guests hold or pay, they show up here.
          </p>
        )}
      </div>
    </section>
  );
}
