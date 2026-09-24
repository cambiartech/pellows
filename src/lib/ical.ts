/**
 * Minimal iCal VEVENT parser for OTA busy ranges.
 * DTEND is exclusive (iCal style) — matches CalendarBlock.endDate.
 */

export type IcalEvent = {
  uid: string;
  summary?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD exclusive
};

function unfold(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function icalDateToYmd(value: string): string | null {
  const v = value.trim();
  // DATE: 20261224
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  // DATETIME: 20261224T150000Z or 20261224T150000
  const m = v.match(/^(\d{8})T/);
  if (m) {
    const d = m[1];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

function addOneDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function parseIcalBusyRanges(ics: string): IcalEvent[] {
  const text = unfold(ics);
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const events: IcalEvent[] = [];

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? "";
    const uid = /UID:(.+)/i.exec(body)?.[1]?.trim() || `evt-${events.length}`;
    const summary = /SUMMARY:(.+)/i.exec(body)?.[1]?.trim();
    const description = /DESCRIPTION:(.+)/i.exec(body)?.[1]?.trim();
    const guestNote = [summary, description].filter(Boolean).join(" · ");
    const dtStartRaw =
      /DTSTART[^:]*:([^\r\n]+)/i.exec(body)?.[1]?.trim() ||
      /DTSTART;[^:]*:([^\r\n]+)/i.exec(body)?.[1]?.trim();
    const dtEndRaw =
      /DTEND[^:]*:([^\r\n]+)/i.exec(body)?.[1]?.trim() ||
      /DTEND;[^:]*:([^\r\n]+)/i.exec(body)?.[1]?.trim();

    if (!dtStartRaw) continue;
    const startDate = icalDateToYmd(dtStartRaw);
    if (!startDate) continue;

    let endDate = dtEndRaw ? icalDateToYmd(dtEndRaw) : null;
    // All-day Airbnb often uses DATE; if only start, block one night
    if (!endDate) endDate = addOneDay(startDate);
    // Same-day DTSTART=DTEND (rare) → at least one night
    if (endDate <= startDate) endDate = addOneDay(startDate);

    events.push({
      uid,
      summary: guestNote || undefined,
      startDate,
      endDate,
    });
  }

  return events;
}

export async function fetchIcal(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/calendar, text/plain, */*",
      "User-Agent": "PellowsCalendarSync/1.0",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch calendar (${res.status})`);
  }
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error("URL did not return a valid iCal calendar");
  }
  return text;
}
