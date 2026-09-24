"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LAGOS_AREAS } from "@/lib/agency";

type Listing = { id: string; title: string; status: string; icalUrl?: string | null };

const SOURCES = [
  {
    id: "airbnb",
    label: "Airbnb",
    blurb: "URL + iCal. Keeps who is already in.",
  },
  {
    id: "booking",
    label: "Booking.com",
    blurb: "URL + iCal. Keeps who is already in.",
  },
  {
    id: "csv",
    label: "CSV bulk",
    blurb: "10+ units from a spreadsheet.",
  },
  {
    id: "realcorp",
    label: "Realcorp",
    blurb: "Pull rooms, rates, photos. Add a markup.",
  },
  {
    id: "manual",
    label: "Manual",
    blurb: "Add one apartment.",
  },
] as const;

type SourceId = (typeof SOURCES)[number]["id"];

export default function ImportHubPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SourceId>("airbnb");
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingUrl, setListingUrl] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("Lekki");
  const [basePrice, setBasePrice] = useState("150000");
  const [listingId, setListingId] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [useSourcePrice, setUseSourcePrice] = useState(true);
  const [markupPercent, setMarkupPercent] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const me = await fetch("/api/v1/auth/me");
    if (!me.ok) {
      router.replace("/login");
      return;
    }
    const res = await fetch("/api/v1/listings");
    const data = await res.json();
    if (res.ok) {
      setListings(data.listings ?? []);
      if (!listingId && data.listings?.[0]?.id) {
        setListingId(data.listings[0].id);
      }
    }
    setReady(true);
    const linkRes = await fetch("/api/v1/imports/realcorp");
    if (linkRes.ok) {
      const linkData = await linkRes.json();
      if (linkData.link) {
        setTenantId(linkData.link.tenantId || "");
        setConnected(Boolean(linkData.link.connected));
        setUseSourcePrice(linkData.link.useSourcePrice !== false);
        setMarkupPercent(String(linkData.link.markupPercent ?? 0));
      }
    }
  }, [router, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function importUrl() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/imports/listing-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: listingUrl,
          neighbourhood: neighbourhood === "Other" ? undefined : neighbourhood,
          basePrice: Number(basePrice) || undefined,
          goLive: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setListingId(data.listing.id);
      setMsg(`Draft created: ${data.listing.title}. Attach iCal, edit, then Go LIVE.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncIcal() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/imports/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, icalUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "iCal sync failed");
      setMsg(`Calendar synced — ${data.blocksImported} busy range(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "iCal sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncRealcorp() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/imports/realcorp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId.trim() || undefined,
          ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
          useSourcePrice,
          markupPercent: useSourcePrice ? 0 : Number(markupPercent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Realcorp sync failed");
      if (data.status === "saved_pending_api") {
        setMsg(data.message);
      } else {
        setMsg(
          data.published
            ? `Realcorp: ${data.created} new, ${data.updated} updated. ${data.published} went live because this workspace is already live.`
            : `Realcorp: ${data.created} new, ${data.updated} updated. New rooms stay drafts until you Go LIVE. After that, later apartments publish on their own.`,
        );
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Realcorp sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/imports/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, forceDraft: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV import failed");
      const warn =
        data.errors?.length > 0 ? ` (${data.errors.length} row warning(s))` : "";
      setMsg(`Imported ${data.imported} draft unit(s)${warn}. Edit → Go LIVE.`);
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
      setError(null);
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsText(file);
  }

  if (!ready) {
    return <div className="px-6 pt-32 text-[var(--muted)]">Loading…</div>;
  }

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-lg">
        <Link href="/host" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Workspace
        </Link>
        <h1 className="font-display mt-4 text-heading">Link your listings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          URL + iCal + CSV today. Partner APIs when credentials land.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id === "manual") {
                  router.push("/host/new");
                  return;
                }
                setSource(s.id);
                setError(null);
                setMsg(null);
              }}
              className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                source === s.id
                  ? "border-[var(--sea)] bg-[var(--foam)]"
                  : "border-black/10 bg-white/70 hover:border-black/20"
              }`}
            >
              <span className="font-semibold text-[var(--ink)]">{s.label}</span>
              <span className="mt-1 block text-[0.7rem] leading-snug text-[var(--muted)]">
                {s.blurb}
              </span>
            </button>
          ))}
        </div>

        {source === "realcorp" && (
          <div className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Realcorp shortlets
            </p>
            <p className="text-sm text-[var(--muted)]">
              A Realcorp workspace is listed only if that tenant turns Pellows
              on. Paste their tenant id and connection token. Other tenants stay
              off. The first rooms are drafts until you Go LIVE. After that, a
              new apartment they post shows up here on its own. If you don’t
              want guests to see the ERP rate, add a markup.
            </p>
            <label className="block text-sm">
              <span className="auth-label">Realcorp tenant id</span>
              <input
                className="auth-input mt-2"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Their workspace id"
              />
            </label>
            <label className="block text-sm">
              <span className="auth-label">
                Connection token{connected ? " · already saved" : ""}
              </span>
              <input
                type="password"
                autoComplete="off"
                className="auth-input mt-2"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={connected ? "Paste a new token to replace it" : "From Realcorp after they opt in"}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                checked={useSourcePrice}
                onChange={(e) => setUseSourcePrice(e.target.checked)}
              />
              Use their nightly rate
            </label>
            {!useSourcePrice && (
              <label className="block text-sm">
                <span className="auth-label">Your markup %</span>
                <input
                  className="auth-input mt-2"
                  inputMode="decimal"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                />
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Added on top of their rate before a guest sees it.
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncRealcorp()}
              className="btn-pill btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Syncing…" : "Save and sync"}
            </button>
          </div>
        )}

        {source === "csv" && (
          <div className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">Bulk import CSV</p>
            <p className="text-sm text-[var(--muted)]">
              Download the template, fill rows, upload. Creates drafts — you Go LIVE.
            </p>
            <a
              href="/templates/pellows-listings.csv"
              download
              className="inline-flex text-sm font-semibold text-[var(--sea)] underline-offset-4 hover:underline"
            >
              Download template
            </a>
            <label className="block text-sm">
              <span className="auth-label">Upload .csv</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="auth-input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[var(--foam)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block text-sm">
              <span className="auth-label">Or paste CSV</span>
              <textarea
                rows={6}
                className="auth-input mt-2 font-mono text-[0.8rem]"
                placeholder="title,description,neighbourhood,..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy || csvText.trim().length < 10}
              onClick={() => void importCsv()}
              className="btn-pill btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import as drafts"}
            </button>
          </div>
        )}

        {(source === "airbnb" || source === "booking") && (
          <>
            <div className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">
                1. Import from {source === "airbnb" ? "Airbnb" : "Booking.com"} URL
              </p>
              <label className="block text-sm">
                <span className="auth-label">Listing link</span>
                <input
                  className="auth-input mt-2"
                  placeholder={
                    source === "airbnb"
                      ? "https://www.airbnb.com/rooms/…"
                      : "https://www.booking.com/hotel/…"
                  }
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="auth-label">Area</span>
                  <select
                    className="auth-input mt-2"
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                  >
                    {LAGOS_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="auth-label">Nightly (NGN)</span>
                  <input
                    type="number"
                    className="auth-input mt-2"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy || !listingUrl.trim()}
                onClick={() => void importUrl()}
                className="btn-pill btn-primary w-full disabled:opacity-50"
              >
                Create draft from URL
              </button>
            </div>

            <div className="mt-4 space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
              <p className="text-sm font-semibold text-[var(--ink)]">
                2. Sync calendar (iCal)
              </p>
              <label className="block text-sm">
                <span className="auth-label">Your unit</span>
                <select
                  className="auth-input mt-2"
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                >
                  {listings.length === 0 ? (
                    <option value="">Import a URL first</option>
                  ) : (
                    listings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} ({l.status})
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="auth-label">iCal URL</span>
                <input
                  className="auth-input mt-2"
                  placeholder="https://…calendar.ics"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || !listingId || !icalUrl.trim()}
                onClick={() => void syncIcal()}
                className="btn-pill btn-ghost w-full disabled:opacity-50"
              >
                Sync busy dates
              </button>
            </div>
          </>
        )}

        {error && (
          <div
            className="mt-4 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
            role="alert"
          >
            {error}
          </div>
        )}
        {msg && (
          <p className="mt-4 text-sm font-medium text-[var(--sea)]">{msg}</p>
        )}

        <p className="mt-8 text-center text-sm">
          <Link href="/host" className="font-semibold text-[var(--sea)] hover:underline">
            Back to workspace → Go LIVE
          </Link>
        </p>
      </div>
    </section>
  );
}
