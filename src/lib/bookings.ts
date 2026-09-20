import { prisma } from "@/lib/db";
import type { BookingChannel } from "@/generated/prisma";

const HOLD_MINUTES = 30;

function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function parseDate(value: string) {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

export type CreateBookingInput = {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  channel?: BookingChannel;
  notes?: string;
};

/** Release calendar holds whose booking hold window expired. */
export async function expireStaleHolds(listingId?: string) {
  const now = new Date();
  const stale = await prisma.booking.findMany({
    where: {
      status: { in: ["HOLD", "PENDING_PAYMENT"] },
      holdExpiresAt: { lt: now },
      ...(listingId ? { listingId } : {}),
    },
    select: { id: true },
    take: 100,
  });
  if (!stale.length) return 0;

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: stale.map((b) => b.id) } },
      data: { status: "EXPIRED", holdExpiresAt: null },
    }),
    prisma.calendarBlock.deleteMany({
      where: {
        bookingId: { in: stale.map((b) => b.id) },
        source: "HOLD",
      },
    }),
  ]);
  return stale.length;
}

/**
 * Create a date hold. Conflict check runs inside a Serializable transaction
 * so two guests racing the same nights → only one wins.
 */
export async function createHold(input: CreateBookingInput) {
  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);
  if (checkOut <= checkIn) throw new Error("checkOut must be after checkIn");

  await expireStaleHolds(input.listingId);

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
  });
  if (!listing || listing.status !== "LIVE") {
    throw new Error("Listing not available");
  }
  if (listing.maxGuests < input.guests) {
    throw new Error("Too many guests for this listing");
  }

  const nights = nightsBetween(checkIn, checkOut);
  const subtotal =
    listing.priceUnit === "NIGHT" || listing.priceUnit === "WEEK"
      ? listing.basePrice * nights
      : listing.basePrice;
  const fees = listing.cleaningFee;
  const total = subtotal + fees;
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.calendarBlock.findFirst({
          where: {
            listingId: listing.id,
            startDate: { lt: checkOut },
            endDate: { gt: checkIn },
          },
        });
        if (conflict) throw new Error("Dates not available");

        const booking = await tx.booking.create({
          data: {
            listingId: listing.id,
            status: "HOLD",
            channel: input.channel ?? "WEB",
            guestName: input.guestName,
            guestPhone: input.guestPhone,
            guestEmail: input.guestEmail,
            checkIn,
            checkOut,
            guests: input.guests,
            currency: listing.currency,
            subtotal,
            fees,
            total,
            holdExpiresAt,
            notes: input.notes,
          },
        });

        await tx.calendarBlock.create({
          data: {
            listingId: listing.id,
            startDate: checkIn,
            endDate: checkOut,
            source: "HOLD",
            bookingId: booking.id,
            summary: `Hold ${booking.id}`,
          },
        });

        return booking;
      },
      {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Postgres serialization failure / unique race → guest-friendly conflict
    if (
      msg === "Dates not available" ||
      /could not serialize|serialization|40001/i.test(msg)
    ) {
      throw new Error("Dates not available");
    }
    throw err;
  }
}

export async function confirmBooking(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "CONFIRMED") return booking;
    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      throw new Error("Booking is no longer confirmable");
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", holdExpiresAt: null },
    });

    await tx.calendarBlock.updateMany({
      where: { bookingId },
      data: { source: "BOOKING", summary: `Booking ${bookingId}` },
    });

    return updated;
  });
}

/** Simple v1 cancel — frees calendar; refunds handled off-band until rails live. */
export async function cancelBooking(bookingId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "CANCELLED") return booking;
    if (booking.status === "CONFIRMED") {
      // v1: allow cancel; money clawback is manual until Stripe refunds wired
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        holdExpiresAt: null,
        notes: reason
          ? `${booking.notes || ""}\nCancelled: ${reason}`.trim()
          : booking.notes,
      },
    });

    await tx.calendarBlock.deleteMany({
      where: { bookingId },
    });

    return updated;
  });
}
