"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Host = {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
};

type Listing = {
  id: string;
  title: string;
  city: string;
  neighbourhood: string | null;
  status: string;
  currency: string;
  basePrice: number;
  maxGuests: number;
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

export default function HostDashboard() {
  const router = useRouter();
  const [host, setHost] = useState<Host | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [counts, setCounts] = useState({ total: 0, live: 0, draft: 0, paused: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const me = await fetch("/api/v1/auth/me");
    if (!me.ok) {
      router.replace("/login");
      return;
    }
    const meData = await me.json();
    setHost(meData.host);

    const res = await fetch("/api/v1/listings");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load listings");
      return;
    }
    setListings(data.listings ?? []);
    setCounts(data.counts ?? { total: 0, live: 0, draft: 0, paused: 0 });
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "LIVE" | "PAUSED" | "DRAFT") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/listings/${id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      await load();
      router.push(`/host/${data.listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!host) {
    return (
      <div className="px-6 pt-32 text-[var(--muted)]">Loading workspace…</div>
    );
  }

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-[var(--content-max)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Agency workspace
            </p>
            <h1 className="font-display mt-2 text-heading-lg">
              {host.businessName || host.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{host.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/host/new" className="btn-pill btn-primary">
              Add apartment
            </Link>
            <Link href="/host/import" className="btn-pill btn-ghost">
              Link existing
            </Link>
            <Link href="/host/bookings" className="btn-pill btn-ghost">
              Inbox
            </Link>
            <Link href="/host/settings" className="btn-pill btn-ghost">
              Settings
            </Link>
            <button type="button" onClick={() => void logout()} className="btn-pill btn-ghost">
              Log out
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            ["Live", counts.live],
            ["Draft", counts.draft],
            ["Total", counts.total],
          ].map(([label, n]) => (
            <div
              key={label}
              className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)]/80 px-4 py-3"
            >
              <p className="text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">
                {label}
              </p>
              <p className="font-display mt-1 text-2xl font-medium tabular-nums">
                {n}
              </p>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-[#9a4030]">{error}</p>}

        <ul className="mt-10 space-y-3">
          {listings.map((l) => (
            <li
              key={l.id}
              className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)]/80 px-4 py-4 md:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-medium tracking-[-0.02em]">
                    {l.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {[l.neighbourhood, l.city].filter(Boolean).join(" · ")} ·{" "}
                    {money(l.basePrice, l.currency)}/night · {l.maxGuests} guests
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide ${
                      l.status === "LIVE"
                        ? "bg-[var(--foam)] text-[var(--sea)]"
                        : "bg-black/5 text-[var(--muted)]"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/host/${l.id}`}
                    className="btn-pill btn-ghost text-[0.8125rem]"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === l.id}
                    onClick={() => void duplicate(l.id)}
                    className="btn-pill btn-ghost text-[0.8125rem] disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  {l.status !== "LIVE" ? (
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void setStatus(l.id, "LIVE")}
                      className="btn-pill btn-primary text-[0.8125rem] disabled:opacity-50"
                    >
                      Go live
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void setStatus(l.id, "PAUSED")}
                      className="btn-pill btn-ghost text-[0.8125rem] disabled:opacity-50"
                    >
                      Pause
                    </button>
                  )}
                  <Link
                    href={`/search?city=${encodeURIComponent(l.city)}`}
                    className="btn-pill btn-ghost text-[0.8125rem]"
                  >
                    View search
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!listings.length && (
          <div className="mt-10 rounded-[var(--radius-panel)] border border-dashed border-[var(--hairline-strong)] px-6 py-12 text-center">
            <p className="font-display text-xl">No apartments yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Add your first shortlet — guests can find it on search and chat.
            </p>
            <Link href="/host/new" className="btn-pill btn-primary mt-6 inline-flex">
              Add apartment
            </Link>
            <Link href="/host/import" className="btn-pill btn-ghost mt-3 inline-flex">
              Link Airbnb / Booking
            </Link>
          </div>
        )}

        <p className="mt-10 text-sm text-[var(--muted)]">
          Duplicate copies rates & amenities as a new draft. Import hub for URL /
          iCal / CSV.
        </p>
      </div>
    </section>
  );
}
