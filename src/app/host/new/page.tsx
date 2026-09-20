"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AMENITY_OPTIONS, LAGOS_AREAS } from "@/lib/agency";

const STEPS = ["Basics", "Place", "Details", "Publish"] as const;

export default function NewListingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    neighbourhood: "Lekki",
    city: "Lagos",
    country: "Nigeria",
    currency: "NGN",
    basePrice: "250000",
    cleaningFee: "50000",
    bedrooms: "2",
    bathrooms: "2",
    maxGuests: "4",
    amenities: ["wifi", "ac", "generator"] as string[],
    goLive: true,
  });

  useEffect(() => {
    fetch("/api/v1/auth/me").then((r) => {
      if (!r.ok) router.replace("/login");
      else setReady(true);
    });
  }, [router]);

  function toggleAmenity(id: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(id)
        ? f.amenities.filter((a) => a !== id)
        : [...f.amenities, id],
    }));
  }

  function canNext() {
    if (step === 0) return form.title.trim().length >= 3 && form.description.trim().length >= 8;
    if (step === 1) return Boolean(form.neighbourhood && form.city);
    if (step === 2) return Number(form.basePrice) > 0 && Number(form.maxGuests) >= 1;
    return true;
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          city: form.city,
          country: form.country,
          neighbourhood: form.neighbourhood === "Other" ? undefined : form.neighbourhood,
          currency: form.currency,
          basePrice: Number(form.basePrice),
          cleaningFee: Number(form.cleaningFee) || 0,
          bedrooms: Number(form.bedrooms) || 1,
          bathrooms: Number(form.bathrooms) || 1,
          maxGuests: Number(form.maxGuests) || 2,
          amenities: form.amenities,
          status: form.goLive ? "LIVE" : "DRAFT",
          timezone: "Africa/Lagos",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      router.push("/host");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
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
        <h1 className="font-display mt-4 text-heading">Add apartment</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Phone-friendly. Publish and it shows up in guest search.
        </p>

        <div className="mt-6 flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-[var(--sea)]" : "bg-black/10"
              }`}
              title={label}
            />
          ))}
        </div>
        <p className="mt-2 text-[0.75rem] font-medium uppercase tracking-wide text-[var(--muted)]">
          {STEPS[step]}
        </p>

        <div className="mt-6 space-y-4 rounded-[var(--radius-panel)] surface-frost p-5">
          {step === 0 && (
            <>
              <label className="block">
                <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  Title
                </span>
                <input
                  className="field mt-1.5"
                  placeholder="e.g. Lekki 2BR with generator"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  Short description
                </span>
                <textarea
                  className="field mt-1.5 min-h-[100px]"
                  placeholder="What makes this place good for guests?"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Area (Lagos)
              </p>
              <div className="flex flex-wrap gap-2">
                {LAGOS_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        neighbourhood: area,
                        city: "Lagos",
                        country: "Nigeria",
                      }))
                    }
                    className={`rounded-[var(--radius-pill)] px-3 py-2 text-[0.8125rem] font-medium ${
                      form.neighbourhood === area
                        ? "bg-[var(--sea)] text-[#f7f4ee]"
                        : "border border-[var(--hairline)]"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Nightly (₦)
                  </span>
                  <input
                    type="number"
                    className="field mt-1.5"
                    value={form.basePrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, basePrice: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Cleaning (₦)
                  </span>
                  <input
                    type="number"
                    className="field mt-1.5"
                    value={form.cleaningFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cleaningFee: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Bedrooms
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="field mt-1.5"
                    value={form.bedrooms}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bedrooms: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Max guests
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="field mt-1.5"
                    value={form.maxGuests}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxGuests: e.target.value }))
                    }
                  />
                </label>
              </div>
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Amenities
              </p>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAmenity(a.id)}
                    className={`rounded-[var(--radius-pill)] px-3 py-2 text-[0.8125rem] font-medium ${
                      form.amenities.includes(a.id)
                        ? "bg-[var(--sea)] text-[#f7f4ee]"
                        : "border border-[var(--hairline)]"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p className="font-display text-xl">{form.title}</p>
              <p className="text-[var(--muted)]">
                {form.neighbourhood}, {form.city} · ₦
                {Number(form.basePrice).toLocaleString()}/night ·{" "}
                {form.maxGuests} guests
              </p>
              <p className="text-[var(--ink-soft)]">{form.description}</p>
              <label className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  checked={form.goLive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, goLive: e.target.checked }))
                  }
                />
                <span>Go LIVE now (show in guest search & chat)</span>
              </label>
            </div>
          )}

          {error && <p className="text-sm text-[#9a4030]">{error}</p>}

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <button
                type="button"
                className="btn-pill btn-ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canNext()}
                className="btn-pill btn-primary flex-1 disabled:opacity-40"
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="btn-pill btn-primary flex-1 disabled:opacity-50"
                onClick={() => void publish()}
              >
                {busy ? "Publishing…" : form.goLive ? "Publish live" : "Save draft"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
