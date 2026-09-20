import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

export async function GET() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const ownerId = workspaceHostId(host);
  const bookings = await prisma.booking.findMany({
    where: { listing: { hostId: ownerId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      listing: { select: { id: true, title: true, neighbourhood: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, method: true, amount: true },
      },
    },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      channel: b.channel,
      guestName: b.guestName,
      guestPhone: b.guestPhone,
      guestEmail: b.guestEmail,
      checkIn: b.checkIn.toISOString().slice(0, 10),
      checkOut: b.checkOut.toISOString().slice(0, 10),
      guests: b.guests,
      currency: b.currency,
      total: b.total,
      holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
      listing: b.listing,
      latestPayment: b.payments[0] ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
