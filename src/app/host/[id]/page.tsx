"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AMENITY_OPTIONS, LAGOS_AREAS } from "@/lib/agency";
import { HostMonthCalendar } from "@/components/host-month-calendar";

type Listing = {
  id: string;
  title: string;
  description: string;
  city: string;
  neighbourhood: string | null;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number;
  amenities: string[];
  status: string;
  icalUrl: string | null;
  icalSyncedAt: string | null;
  externalListingUrl: string | null;
};

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [availMsg, setAvailMsg] = useState<string | null>(null);
  const [availOk, setAvailOk] = useState<boolean | null>(null);
  const [blocks, setBlocks] = useState<
    { startDate: string; endDate: string; source: string; summary: string | null }[]
  >([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    neighbourhood: "Lekki",
    city: "Lagos",
    basePrice: "",
    cleaningFee: "",
    bedrooms: "1",
    bathrooms: "1",
    maxGuests: "2",
    amenities: [] as string[],
  });

  const load = useCallback(async () => {
    const me = await fetch("/api/v1/auth/me");
    if (!me.ok) {
      router.replace("/login");
      return;
    }
    const res = await fetch(`/api/v1/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      return;
    }
    const l = data.listing as Listing;
    setListing(l);
    setIcalUrl(l.icalUrl || "");
    setForm({
      title: l.title,
      description: l.description,
      neighbourhood: l.neighbourhood || "Lekki",
      city: l.city,
      basePrice: String(Math.round(l.basePrice / 100)),
      cleaningFee: String(Math.round(l.cleaningFee / 100)),
      bedrooms: String(l.bedrooms ?? 1),
      bathrooms: String(l.bathrooms ?? 1),
      maxGuests: String(l.maxGuests),
      amenities: l.amenities ?? [],
    });

    const av = await fetch(`/api/v1/listings/${id}/availability`);
    if (av.ok) {
      const avData = await av.json();
      setBlocks(avData.blocks ?? []);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleAmenity(aid: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(aid)
        ? f.amenities.filter((a) => a !== aid)
        : [...f.amenities, aid],
    }));
  }

  async function save(extra?: { status?: string }) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/v1/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          neighbourhood: form.neighbourhood === "Other" ? "" : form.neighbourhood,
          city: form.city,
          basePrice: Number(form.basePrice),
          cleaningFee: Number(form.cleaningFee) || 0,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 0,
          maxGuests: Number(form.maxGuests) || 1,
          amenities: form.amenities,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setListing(data.listing);
      setSaved(true);
      if (extra?.status === "LIVE") router.push("/host");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncIcal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/imports/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, icalUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "iCal sync failed");
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "iCal sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkAvailability() {
    setBusy(true);
    setError(null);
    setAvailMsg(null);
    setAvailOk(null);
    try {
      if (!checkIn || !checkOut) {
        throw new Error("Pick check-in and check-out");
      }
      const res = await fetch(
        `/api/v1/listings/${id}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setAvailOk(Boolean(data.available));
      setAvailMsg(data.message);
      setBlocks(data.blocks ?? blocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/listings/${id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      router.push(`/host/${data.listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
      setBusy(false);
    }
  }

  if (!listing && !error) {
    return <div className="px-6 pt-32 text-[var(--muted)]">Loading…</div>;
  }

  if (!listing) {
    return (
      <div className="px-6 pt-32">
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/host" className="mt-4 inline-block text-[var(--sea)]">
          ← Workspace
        </Link>
      </div>
    );
  }

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-lg">
        <Link href="/host" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Workspace
        </Link>
        <h1 className="font-display mt-4 text-heading">Edit apartment</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Status: {listing.status}
          {listing.externalListingUrl ? " · linked from URL" : ""}
        </p>

        <div className="mt-6 space-y-4 rounded-[var(--radius-panel)] surface-frost p-5">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Title</span>
            <input
              className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Description</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Area</span>
              <select
                className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
                value={form.neighbourhood}
                onChange={(e) => setForm({ ...form, neighbourhood: e.target.value })}
              >
                {LAGOS_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Nightly (NGN)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["bedrooms", "Beds"],
                ["bathrooms", "Baths"],
                ["maxGuests", "Guests"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-[var(--muted)]">{label}</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Cleaning fee (NGN)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-[var(--radius-control)] border border-black/10 bg-white/70 px-3 py-2.5"
              value={form.cleaningFee}
              onChange={(e) => setForm({ ...form, cleaningFee: e.target.value })}
            />
          </label>
          <div>
            <p className="text-sm text-[var(--muted)]">Amenities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    form.amenities.includes(a.id)
                      ? "bg-[var(--sea)] text-white"
                      : "border border-black/10 text-[var(--ink)]"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-[var(--radius-panel)] surface-frost p-5">
          <p className="text-sm font-medium text-[var(--ink)]">Calendar (iCal)</p>
          <input
            className="auth-input"
            placeholder="https://…calendar.ics"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
          />
          {listing.icalSyncedAt && (
            <p className="text-[0.7rem] text-[var(--muted)]">
              Last sync: {new Date(listing.icalSyncedAt).toLocaleString()}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !icalUrl.trim()}
            onClick={() => void syncIcal()}
            className="btn-pill btn-ghost disabled:opacity-50"
          >
            Sync busy dates
          </button>
        </div>

        <div className="mt-4 space-y-3 rounded-[var(--radius-panel)] surface-frost p-5">
          <p className="text-sm font-medium text-[var(--ink)]">Visual calendar</p>
          <HostMonthCalendar
            listingId={id}
            blocks={blocks}
            onChanged={() => void load()}
          />
        </div>

        <div className="mt-4 space-y-3 rounded-[var(--radius-panel)] surface-frost p-5">
          <p className="text-sm font-medium text-[var(--ink)]">
            Conflict check
          </p>
          <p className="text-sm text-[var(--muted)]">
            Guests shouldn’t see “already booked Dec 24–26” surprises.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="auth-label">Check-in</span>
              <input
                type="date"
                className="auth-input mt-2"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="auth-label">Check-out</span>
              <input
                type="date"
                className="auth-input mt-2"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void checkAvailability()}
            className="btn-pill btn-ghost disabled:opacity-50"
          >
            Check dates
          </button>
          {availMsg && (
            <p
              className={`text-sm font-medium ${
                availOk ? "text-[var(--sea)]" : "text-[#b42318]"
              }`}
              role="status"
            >
              {availMsg}
            </p>
          )}
          {blocks.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
              {blocks.map((b) => (
                <li key={`${b.startDate}-${b.endDate}-${b.source}`}>
                  <span className="font-medium text-[var(--ink-soft)]">
                    {b.startDate} → {b.endDate}
                  </span>{" "}
                  · {b.source}
                  {b.summary ? ` · ${b.summary}` : ""}
                </li>
              ))}
            </ul>
          )}
          {!blocks.length && (
            <p className="text-sm text-[var(--muted)]">No upcoming busy dates.</p>
          )}
        </div>

        {error && (
          <div
            className="mt-4 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
            role="alert"
          >
            {error}
          </div>
        )}
        {saved && !error && (
          <p className="mt-4 text-sm text-[var(--sea)]">Saved.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="btn-pill btn-ghost disabled:opacity-50"
          >
            Save changes
          </button>
          {listing.status !== "LIVE" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save({ status: "LIVE" })}
              className="btn-pill btn-primary disabled:opacity-50"
            >
              Save & go LIVE
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void duplicate()}
            className="btn-pill btn-ghost disabled:opacity-50"
          >
            Duplicate unit
          </button>
        </div>
      </div>
    </section>
  );
}
