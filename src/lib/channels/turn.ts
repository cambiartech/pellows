import { optionSheetHeader, optionSheetRows } from "@/lib/agent/option-sheet";
import type { GuestTurn } from "@/lib/channels/types";

type SessionLike = {
  phase?: string;
  area?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  results?: {
    title: string;
    city: string;
    neighbourhood: string | null;
    currency: string;
    basePrice: number;
    maxGuests: number;
    bedrooms: number | null;
    photoUrl?: string | null;
  }[];
  payUrl?: string;
  bookingStatusUrl?: string;
};

/** Map the agent session into the sheet / pay actions every channel can render. */
export function guestTurnFromSession(
  reply: string,
  session: SessionLike | null | undefined,
): GuestTurn {
  const turn: GuestTurn = { text: reply };
  if (!session) return turn;

  if (session.phase === "showing" && session.results?.length) {
    const rows = optionSheetRows(session.results);
    turn.sheet = {
      header: optionSheetHeader(session),
      rows: rows.map((r) => ({
        id: `pick:${r.id}`,
        title: r.title,
        subtitle: r.meta,
        price: `${r.price}/night`,
        imageUrl: r.photoUrl,
      })),
    };
  }

  if (session.phase === "paying" && session.payUrl) {
    turn.pay = {
      label: "Pay now",
      url: session.payUrl,
    };
  }

  if (session.bookingStatusUrl) {
    turn.status = {
      label: "Open booking",
      url: session.bookingStatusUrl,
    };
  }

  return turn;
}
