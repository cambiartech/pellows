import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How agencies get bookings & payouts",
  description:
    "Join Pellows: list shortlets, sync calendars, get guests from search and chat, payouts to bank or crypto.",
};

export default function ForAgenciesPage() {
  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-2xl">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
          For agencies
        </p>
        <h1 className="font-display mt-3 text-heading-lg">
          How you get bookings + payouts
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          One-pager for Lagos shortlet teams. Share this link on WhatsApp when
          you visit an agency.
        </p>

        <ol className="mt-10 space-y-8">
          {[
            {
              t: "1. Join on your phone",
              d: "Sign up at /join with business name, phone, WhatsApp. Takes a few minutes.",
            },
            {
              t: "2. Add inventory the easy way",
              d: "Wizard, CSV bulk, or paste Airbnb/Booking URL + iCal. Go LIVE when ready.",
            },
            {
              t: "3. Guests find you",
              d: "Search, WhatsApp chat, and AI agents query the same live calendar.",
            },
            {
              t: "4. Guests pay in-app",
              d: "Card, bank transfer, or crypto — handled by Pellows. Calendar locks on confirm.",
            },
            {
              t: "5. You get paid",
              d: "Add bank or USDT wallet in Settings. Transparent platform fee (default 10%) shown in workspace.",
            },
          ].map((x) => (
            <li key={x.t}>
              <h2 className="font-display text-xl font-medium">{x.t}</h2>
              <p className="mt-2 text-[var(--muted)]">{x.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/join" className="btn-pill btn-primary">
            Join Pellows
          </Link>
          <Link href="/login" className="btn-pill btn-ghost">
            Agency log in
          </Link>
        </div>
      </div>
    </section>
  );
}
