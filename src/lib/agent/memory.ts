import { prisma } from "@/lib/db";
import type { Session, StayCard } from "@/lib/agent/guest-agent";

type PersistedSession = {
  phase: Session["phase"];
  city?: string;
  area?: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  vibe: string[];
  budgetMax?: number;
  bedrooms?: number;
  results: StayCard[];
  selected?: StayCard;
  guestName?: string;
  bookingId?: string;
  paymentIntentId?: string;
  payUrl?: string;
};

export async function loadConversationState(
  conversationId: string,
): Promise<PersistedSession | null> {
  try {
    const row = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { state: true },
    });
    if (!row?.state || typeof row.state !== "object") return null;
    return row.state as PersistedSession;
  } catch (err) {
    console.error("[pellows.memory.load]", err);
    return null;
  }
}

export async function saveConversationState(
  conversationId: string,
  session: Session,
) {
  const state: PersistedSession = {
    phase: session.phase,
    city: session.city,
    area: session.area,
    checkIn: session.checkIn,
    checkOut: session.checkOut,
    guests: session.guests,
    vibe: session.vibe,
    budgetMax: session.budgetMax,
    bedrooms: session.bedrooms,
    results: session.results,
    selected: session.selected,
    guestName: session.guestName,
    bookingId: session.bookingId,
    paymentIntentId: session.paymentIntentId,
    payUrl: session.payUrl,
  };
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { state },
    });
  } catch (err) {
    console.error("[pellows.memory.save]", err);
  }
}

export type LastBookingSummary = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  listingTitle: string;
  city: string;
  total: number;
  currency: string;
};

/** Remember last booking for this WhatsApp / phone guest. */
export async function loadLastBooking(
  waPhone: string,
): Promise<LastBookingSummary | null> {
  const phone = waPhone.replace(/^\+/, "");
  const withPlus = phone.startsWith("+") ? phone : `+${phone}`;
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { guestPhone: phone },
          { guestPhone: withPlus },
          { guest: { whatsappId: phone } },
          { guest: { whatsappId: withPlus } },
          { guest: { phone: phone } },
          { guest: { phone: withPlus } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true, city: true } },
      },
    });
    if (!booking) return null;
    return {
      id: booking.id,
      status: booking.status,
      checkIn: String(booking.checkIn).slice(0, 10),
      checkOut: String(booking.checkOut).slice(0, 10),
      guests: booking.guests,
      listingTitle: booking.listing.title,
      city: booking.listing.city,
      total: booking.total,
      currency: booking.currency,
    };
  } catch (err) {
    console.error("[pellows.memory.lastBooking]", err);
    return null;
  }
}
