import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dualPriceLabel } from "@/lib/money";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Your booking · Pellows",
  robots: { index: false, follow: false },
};

export default async function BookingStatusPage({ params }: Params) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          title: true,
          slug: true,
          city: true,
          neighbourhood: true,
          currency: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!booking) notFound();

  const pay = booking.payments[0];
  const place = [booking.listing.neighbourhood, booking.listing.city]
    .filter(Boolean)
    .join(", ");
  const total = dualPriceLabel(booking.total, booking.currency);

  const statusLabel: Record<string, string> = {
    HOLD: "Hold — complete payment to lock",
    PENDING_PAYMENT: "Awaiting payment",
    CONFIRMED: "Confirmed — you’re booked",
    CANCELLED: "Cancelled",
    EXPIRED: "Hold expired",
  };

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-lg">
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Booking status
        </p>
        <h1 className="font-display mt-3 text-heading">
          {booking.listing.title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{place}</p>

        <div className="mt-8 space-y-4 rounded-[var(--radius-panel)] surface-frost p-5">
          <p className="text-lg font-medium text-[var(--sea)]">
            {statusLabel[booking.status] || booking.status}
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Guest</dt>
              <dd className="font-medium">{booking.guestName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Dates</dt>
              <dd className="font-medium tabular-nums">
                {String(booking.checkIn).slice(0, 10)} →{" "}
                {String(booking.checkOut).slice(0, 10)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Guests</dt>
              <dd className="font-medium">{booking.guests}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Total</dt>
              <dd className="font-medium tabular-nums">
                {total.usd || total.primary}
                {total.usd ? (
                  <span className="block text-right text-[0.75rem] font-normal text-[var(--muted)]">
                    {total.primary}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 pt-2">
            {pay && booking.status !== "CONFIRMED" && booking.status !== "CANCELLED" && (
              <Link
                href={`/pay/${pay.id}`}
                className="btn-pill btn-primary w-full text-center"
              >
                Continue to pay
              </Link>
            )}
            <Link
              href={`/stays/${booking.listing.slug}`}
              className="btn-pill btn-ghost w-full text-center"
            >
              View stay
            </Link>
            <Link href="/chat" className="btn-pill btn-ghost w-full text-center">
              Chat with Pellows
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
