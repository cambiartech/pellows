import { dualPriceLabel } from "@/lib/money";

/** Query line on a Muse-style option sheet: “Lekki · Dec 20–27 · 4 guests”. */
export function optionSheetHeader(input: {
  area?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}) {
  const place = input.area || input.city || "Stays";
  const dates = shortRange(input.checkIn, input.checkOut);
  const guests =
    input.guests && input.guests > 0
      ? `${input.guests} guest${input.guests === 1 ? "" : "s"}`
      : null;
  return [place, dates, guests].filter(Boolean).join(" · ");
}

export type SheetStay = {
  title: string;
  city: string;
  neighbourhood: string | null;
  currency: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number | null;
  photoUrl?: string | null;
};

export function optionSheetRows(stays: SheetStay[]) {
  return stays.slice(0, 8).map((r, i) => {
    const price = dualPriceLabel(r.basePrice, r.currency);
    const amount = price.usd || price.primary;
    const meta = [
      r.neighbourhood || r.city,
      r.bedrooms ? `${r.bedrooms} bed` : null,
      r.maxGuests ? `sleeps ${r.maxGuests}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: String(i + 1),
      title: r.title,
      price: amount,
      meta,
      photoUrl: r.photoUrl || undefined,
    };
  });
}

function shortRange(a?: string, b?: string): string | null {
  if (!a || !b) return null;
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const mon = (d: Date) => d.toLocaleString("en-US", { month: "short" });
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) {
    return `${mon(da)} ${da.getDate()}–${db.getDate()}`;
  }
  return `${mon(da)} ${da.getDate()} – ${mon(db)} ${db.getDate()}`;
}
