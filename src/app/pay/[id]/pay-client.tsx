"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type Intent = {
  id: string;
  method: "CARD" | "BANK_RAIL" | "CRYPTO";
  status: string;
  amount: number;
  currency: string;
  instructions: Record<string, unknown> | null;
  booking: {
    id: string;
    status: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    listing?: { title: string; city: string };
  };
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency.toUpperCase() === "USD" ? 2 : 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

export default function PayClient() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [method, setMethod] = useState<"CARD" | "BANK_RAIL" | "CRYPTO">("CARD");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [cardProvider, setCardProvider] = useState<string>("flutterwave");

  useEffect(() => {
    fetch(`/api/v1/payments/intents/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Not found");
        setIntent(data.paymentIntent);
        setMethod(data.paymentIntent.method);
        const instr = data.paymentIntent.instructions as {
          provider?: string;
        } | null;
        if (instr?.provider) setCardProvider(instr.provider);
        if (data.paymentIntent.status === "SUCCEEDED") setDone(true);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Stripe redirect confirm
  useEffect(() => {
    const stripe = searchParams.get("stripe");
    const sessionId = searchParams.get("session_id");
    if (stripe !== "success" || !sessionId || done) return;

    setBusy(true);
    fetch("/api/v1/payments/stripe/confirm-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, paymentIntentId: id }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not confirm Stripe payment");
        setDone(true);
        setIntent((prev) =>
          prev
            ? {
                ...prev,
                status: "SUCCEEDED",
                booking: { ...prev.booking, status: "CONFIRMED" },
              }
            : prev,
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Confirm failed"))
      .finally(() => setBusy(false));
  }, [searchParams, id, done]);

  // Flutterwave redirect confirm
  useEffect(() => {
    const flw = searchParams.get("flw");
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");
    if (flw !== "return" || done) return;
    if (status && status !== "successful" && status !== "completed") {
      setError("Card payment was not completed. Try again.");
      return;
    }
    if (!transactionId) return;

    setBusy(true);
    fetch("/api/v1/payments/flutterwave/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: id, transactionId }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not confirm Flutterwave payment");
        setDone(true);
        setIntent((prev) =>
          prev
            ? {
                ...prev,
                status: "SUCCEEDED",
                booking: { ...prev.booking, status: "CONFIRMED" },
              }
            : prev,
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Confirm failed"))
      .finally(() => setBusy(false));
  }, [searchParams, id, done]);

  const usdHint = useMemo(() => {
    if (!intent || intent.currency.toUpperCase() !== "NGN") return null;
    const rate = 1600 * 1.03;
    const usd = intent.amount / 100 / rate;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(usd);
    } catch {
      return `≈ $${usd.toFixed(2)}`;
    }
  }, [intent]);

  async function switchMethod(next: "CARD" | "BANK_RAIL" | "CRYPTO") {
    setMethod(next);
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: intent.booking.id, method: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update method");
      if (data.paymentIntent.id !== intent.id) {
        window.location.href = `/pay/${data.paymentIntent.id}`;
        return;
      }
      const instr = data.paymentIntent.instructions as { provider?: string } | null;
      if (instr?.provider) setCardProvider(instr.provider);
      setIntent({ ...intent, ...data.paymentIntent, booking: intent.booking });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function payWithCard() {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      const path =
        cardProvider === "stripe"
          ? "/api/v1/payments/stripe/checkout"
          : "/api/v1/payments/flutterwave/checkout";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: intent.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      if (!data.url) throw new Error("No Checkout URL returned");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  async function confirmPayDev() {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: intent.id,
          devConfirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setDone(true);
      setIntent({
        ...intent,
        status: "SUCCEEDED",
        booking: { ...intent.booking, status: "CONFIRMED" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  const bank = intent?.instructions as
    | {
        bankName?: string;
        accountName?: string;
        accountNumber?: string;
        reference?: string;
        memo?: string;
      }
    | null;
  const crypto = intent?.instructions as
    | { asset?: string; network?: string; address?: string; reference?: string }
    | null;

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-md">
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Secure checkout
        </p>
        <h1 className="font-display mt-3 text-heading">Pay Pellows</h1>

        {(searchParams.get("stripe") === "cancel" ||
          (searchParams.get("flw") === "return" &&
            searchParams.get("status") &&
            searchParams.get("status") !== "successful")) && (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Checkout cancelled — pick a method and try again.
          </p>
        )}

        {error && !intent && (
          <p className="mt-6 text-sm text-[#9a4030]">{error}</p>
        )}

        {intent && (
          <div className="mt-8 space-y-5 rounded-[var(--radius-panel)] surface-frost p-5">
            <div>
              <p className="font-display text-xl font-medium">
                {intent.booking.listing?.title || "Your stay"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {intent.booking.guestName} · {intent.booking.guests} guests
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {String(intent.booking.checkIn).slice(0, 10)} →{" "}
                {String(intent.booking.checkOut).slice(0, 10)}
              </p>
              <p className="mt-3 text-lg font-medium tabular-nums">
                {money(intent.amount, intent.currency)}
              </p>
              {usdHint && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Card checkout charges about {usdHint} USD
                </p>
              )}
            </div>

            {!done && (
              <>
                <div>
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Pay with
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["CARD", "Card (USD)"],
                        ["BANK_RAIL", "Bank"],
                        ["CRYPTO", "Crypto"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={busy}
                        onClick={() => void switchMethod(value)}
                        className={`rounded-[var(--radius-pill)] px-4 py-2 text-[0.8125rem] font-medium ${
                          method === value
                            ? "bg-[var(--sea)] text-[#f7f4ee]"
                            : "border border-[var(--hairline)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {method === "CARD" && (
                  <p className="text-sm text-[var(--muted)]">
                    International cards via Flutterwave — priced in USD (FX
                    included). Nigerian cards welcome too.
                  </p>
                )}
                {method === "BANK_RAIL" && bank && (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
                    <p>
                      <span className="text-[var(--muted)]">Bank:</span>{" "}
                      {bank.bankName}
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">Name:</span>{" "}
                      {bank.accountName}
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">Account:</span>{" "}
                      {bank.accountNumber}
                    </p>
                    <p className="mt-2 font-medium">Ref: {bank.reference}</p>
                    <p className="mt-1 text-[var(--muted)]">{bank.memo}</p>
                  </div>
                )}
                {method === "CRYPTO" && crypto && (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
                    <p>
                      {crypto.asset} · {crypto.network}
                    </p>
                    <p className="mt-1 break-all font-mono text-[0.8rem]">
                      {crypto.address}
                    </p>
                    <p className="mt-2 font-medium">Ref: {crypto.reference}</p>
                  </div>
                )}

                {error && <p className="text-sm text-[#9a4030]">{error}</p>}

                {method === "CARD" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void payWithCard()}
                    className="btn-pill btn-primary w-full disabled:opacity-50"
                  >
                    {busy
                      ? "Redirecting…"
                      : `Pay with card${usdHint ? ` · ${usdHint}` : ""}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmPayDev()}
                    className="btn-pill btn-primary w-full disabled:opacity-50"
                  >
                    {busy
                      ? "Processing…"
                      : `Mark paid (dev) · ${money(intent.amount, intent.currency)}`}
                  </button>
                )}
                {method !== "CARD" && (
                  <p className="text-[0.7rem] text-[var(--muted)]">
                    Bank/crypto auto-confirm lands when watchers are wired.
                    Dev confirm still works outside production.
                  </p>
                )}
              </>
            )}

            {done && (
              <div className="rounded-[var(--radius-ui)] bg-[var(--foam)] p-4">
                <p className="font-medium text-[var(--sea)]">Payment confirmed</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  Booking status: {intent.booking.status}. Dates are locked.
                </p>
                <Link href="/chat" className="btn-pill btn-primary mt-4 inline-flex">
                  Back to chat
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
