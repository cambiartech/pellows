/**
 * Conversational booking engine for WhatsApp / chat simulator.
 * Asks like a human, understands preferences, sends in-app pay links.
 */

import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { invokeTool } from "@/lib/agent/tools";
import { decideGuestTurn, replyForIntent } from "@/lib/agent/decisions";
import { hasGuestLlm, resolveGuestLlm } from "@/lib/agent/llm-provider";
import { searchListings, type SearchHit } from "@/lib/search";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

type Phase =
  | "greeting"
  | "collecting"
  | "showing"
  | "naming"
  | "paying"
  | "done";

type StayCard = {
  id: string;
  title: string;
  city: string;
  neighbourhood: string | null;
  currency: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number | null;
  amenities: string[];
  blurb: string;
  photoUrl?: string | null;
};

type Session = {
  phase: Phase;
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

const sessions = new Map<string, Session>();

function getSession(key: string): Session {
  let s = sessions.get(key);
  if (!s) {
    s = { phase: "greeting", guests: 2, vibe: [], results: [] };
    sessions.set(key, s);
  }
  return s;
}

/** For WhatsApp interactive follow-ups after a text reply. */
export function peekGuestSession(guestPhone: string): Session | undefined {
  return sessions.get(guestPhone) ?? sessions.get(guestPhone.replace(/^\+/, ""));
}

export type { StayCard, Session };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function parseDates(text: string, now = new Date()): { checkIn?: string; checkOut?: string } {
  const lower = text.toLowerCase();
  const iso = [...text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map((m) => m[0]);
  if (iso.length >= 2) return { checkIn: iso[0], checkOut: iso[1] };

  const dec = text.match(
    /\b(?:dec(?:ember)?\s*)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|to)+\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s*dec(?:ember)?)?\b/i,
  );
  if (dec) {
    return {
      checkIn: `2026-12-${dec[1].padStart(2, "0")}`,
      checkOut: `2026-12-${dec[2].padStart(2, "0")}`,
    };
  }

  // "Dec 20th" alone → assume ~week stay
  const decOne = text.match(
    /\bdec(?:ember)?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (decOne && !dec) {
    const d = Number(decOne[1]);
    return {
      checkIn: `2026-12-${String(d).padStart(2, "0")}`,
      checkOut: `2026-12-${String(Math.min(31, d + 5)).padStart(2, "0")}`,
    };
  }

  if (/\btomorrow\b/i.test(lower)) {
    const inD = addDays(now, 1);
    const outD = addDays(now, 2);
    return { checkIn: isoDate(inD), checkOut: isoDate(outD) };
  }

  if (/\btonight\b|\btoday\b/i.test(lower)) {
    const inD = now;
    const outD = addDays(now, 1);
    return { checkIn: isoDate(inD), checkOut: isoDate(outD) };
  }

  if (/\bnext\s+weekend\b/i.test(lower)) {
    const day = now.getUTCDay();
    const toFri = (5 - day + 7) % 7 || 7;
    const fri = addDays(now, toFri);
    const sun = addDays(fri, 2);
    return { checkIn: isoDate(fri), checkOut: isoDate(sun) };
  }

  if (/\bdetty\b/i.test(lower) && !dec) {
    return { checkIn: "2026-12-20", checkOut: "2026-12-27" };
  }

  return {};
}

function parseGuests(text: string): number | undefined {
  const m =
    text.match(/\b(\d+)\s*(?:guests?|people|pax|friends|of\s+us)\b/i) ||
    text.match(/\b(?:for|with)\s+(\d+)\b/i) ||
    text.match(/\bparty\s+of\s+(\d+)\b/i);
  if (m) return Number(m[1]);
  if (/\bcouple\b/i.test(text)) return 2;
  if (/\bfamily\b/i.test(text)) return 4;
  return undefined;
}

function parseCityArea(text: string): { city?: string; area?: string } {
  const lower = text.toLowerCase();
  if (/victoria\s*island|\bvi\b/.test(lower))
    return { city: "Lagos", area: "Victoria Island" };
  if (/\blekki\b/.test(lower)) return { city: "Lagos", area: "Lekki" };
  if (/\bikoyi\b/.test(lower)) return { city: "Lagos", area: "Ikoyi" };
  if (/\boniru\b/.test(lower)) return { city: "Lagos", area: "Oniru" };
  if (/\byaba\b/.test(lower)) return { city: "Lagos", area: "Yaba" };
  if (/\blagos\b/.test(lower)) return { city: "Lagos" };
  if (/\babuja\b/.test(lower)) return { city: "Abuja" };
  if (/\baccra\b|\bghana\b|\bkumasi\b/.test(lower))
    return { city: "Accra" };
  if (/\bbarbados\b|\bholetown\b/.test(lower))
    return { city: "Holetown", area: undefined };
  if (/mexico\s*city|\bpolanco\b/i.test(lower)) return { city: "Mexico City" };

  const inAt = text.match(
    /\b(?:in|at|around|to|for)\s+([A-Za-z][A-Za-z\s-]{1,28}?)(?:\s+(?:from|for|dec|jan|with|looking|detty)|[,.!?]|$)/i,
  );
  if (inAt) {
    const place = inAt[1].trim();
    if (/^(detty|december|christmas|new\s*year)$/i.test(place)) return {};
    if (/lekki|ikoyi|vi|oniru|ghana|accra/i.test(place))
      return parseCityArea(place);
    return { city: place };
  }
  return {};
}

function parseVibe(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  if (/\bpool\b/.test(lower)) tags.push("pool");
  if (/\bbeach\b|\bwaterfront\b|\bshore\b/.test(lower)) tags.push("beach");
  if (/\bquiet\b|\bpeaceful\b|\bcalm\b/.test(lower)) tags.push("quiet");
  if (/\bparty\b|\bdetty\b|\bnightlife\b/.test(lower)) tags.push("party");
  if (/\bgenerator\b|\bpower\b|\belectricity\b/.test(lower)) tags.push("generator");
  if (/\bcheap\b|\bbudget\b|\baffordable\b|\bnot\s+crazy\s+expensive\b/.test(lower))
    tags.push("budget");
  if (/\bluxury\b|\bpenthouse\b|\bpremium\b/.test(lower)) tags.push("luxury");
  if (/\bwork\b|\bremote\b|\bworkspace\b/.test(lower)) tags.push("workspace");
  return tags;
}

function parseBedrooms(text: string): number | undefined {
  const m = text.match(/\b(\d+)\s*(?:br|bed(?:room)?s?)\b/i);
  return m ? Number(m[1]) : undefined;
}

function parseBudget(text: string): number | undefined {
  // major units per night, convert to minor later if NGN-ish
  const m = text.match(
    /\b(?:under|below|max|budget(?:\s+of)?)\s*[₦n]?\s*\$?\s*([\d,]+)\s*k?\b/i,
  );
  if (!m) return undefined;
  let n = Number(m[1].replace(/,/g, ""));
  if (/\bk\b/i.test(text) || n < 1000) n = n * 1000;
  return n * 100; // minor units
}

function toCard(hit: SearchHit): StayCard {
  const bits = [
    hit.neighbourhood,
    hit.bedrooms ? `${hit.bedrooms}BR` : null,
    hit.maxGuests ? `sleeps ${hit.maxGuests}` : null,
    hit.amenities?.includes("pool") ? "pool" : null,
    hit.amenities?.includes("generator") ? "generator" : null,
  ].filter(Boolean);
  return {
    id: hit.id,
    title: hit.title,
    city: hit.city,
    neighbourhood: hit.neighbourhood,
    currency: hit.currency,
    basePrice: hit.basePrice,
    maxGuests: hit.maxGuests,
    bedrooms: hit.bedrooms,
    amenities: hit.amenities,
    blurb: bits.join(" · "),
    photoUrl: hit.photoUrls?.[0] || null,
  };
}

function filterByPrefs(cards: StayCard[], s: Session): StayCard[] {
  let out = cards;
  if (s.area) {
    const area = s.area.toLowerCase();
    const preferred = out.filter(
      (c) =>
        (c.neighbourhood || "").toLowerCase().includes(area) ||
        c.title.toLowerCase().includes(area),
    );
    if (preferred.length) out = preferred;
  }
  if (s.bedrooms) {
    const br = out.filter((c) => (c.bedrooms || 0) >= s.bedrooms!);
    if (br.length) out = br;
  }
  if (s.vibe.includes("pool")) {
    const pool = out.filter((c) => c.amenities.includes("pool"));
    if (pool.length) out = pool;
  }
  if (s.vibe.includes("beach")) {
    const beach = out.filter(
      (c) =>
        /beach|oniru|water/i.test(c.title) ||
        /oniru|beach/i.test(c.neighbourhood || ""),
    );
    if (beach.length) out = beach;
  }
  if (s.vibe.includes("generator")) {
    const gen = out.filter((c) => c.amenities.includes("generator"));
    if (gen.length) out = gen;
  }
  if (s.vibe.includes("budget") || s.budgetMax) {
    const max = s.budgetMax ?? Math.min(...out.map((c) => c.basePrice)) * 1.2;
    out = [...out].sort((a, b) => a.basePrice - b.basePrice);
    const under = out.filter((c) => c.basePrice <= max);
    if (under.length) out = under;
  }
  if (s.vibe.includes("luxury")) {
    out = [...out].sort((a, b) => b.basePrice - a.basePrice);
  }
  return out.slice(0, 4);
}

function formatResults(cards: StayCard[]): string {
  if (!cards.length) return "I couldn’t find a match with that vibe.";
  const lines = cards.map((c, i) => {
    const place = [c.neighbourhood, c.city].filter(Boolean).join(", ");
    return `${i + 1}) *${c.title}*\n${place} · ${money(c.basePrice, c.currency)}/night${c.blurb ? `\n${c.blurb}` : ""}`;
  });
  return lines.join("\n\n");
}

function missingPrompt(s: Session): string | null {
  if (!s.city) return "Where are you heading — Lagos, Abuja, or somewhere else?";
  if (!s.checkIn || !s.checkOut)
    return "What dates work? (e.g. Dec 20–27, tomorrow, next weekend)";
  if (!s.guests || s.guests < 1) return "How many guests?";
  if (s.vibe.length === 0 && s.phase === "collecting")
    return "What kind of place — pool, beach, quiet, party-ready, or on a budget?";
  return null;
}

function absorb(text: string, s: Session) {
  const { city, area } = parseCityArea(text);
  if (city) s.city = city;
  if (area) s.area = area;
  const dates = parseDates(text);
  if (dates.checkIn) s.checkIn = dates.checkIn;
  if (dates.checkOut) s.checkOut = dates.checkOut;
  const guests = parseGuests(text);
  if (guests) s.guests = guests;
  const vibe = parseVibe(text);
  if (vibe.length) s.vibe = Array.from(new Set([...s.vibe, ...vibe]));
  const br = parseBedrooms(text);
  if (br) s.bedrooms = br;
  const budget = parseBudget(text);
  if (budget) s.budgetMax = budget;
}

function matchPick(text: string, results: StayCard[]): StayCard | undefined {
  const lower = text.toLowerCase().trim();

  const idx =
    text.match(/\b(?:book|option|number|pick|choose|#)?\s*(\d+)\b/i) ||
    text.match(/^(\d+)$/);
  if (idx) {
    const n = Number(idx[1]);
    if (n >= 1 && n <= results.length) return results[n - 1];
  }

  if (/\b(cheaper|cheapest|budget|affordable)\b/i.test(lower)) {
    return [...results].sort((a, b) => a.basePrice - b.basePrice)[0];
  }
  if (/\b(luxury|penthouse|expensive|premium)\b/i.test(lower)) {
    return [...results].sort((a, b) => b.basePrice - a.basePrice)[0];
  }
  if (/\bbeach\b/i.test(lower)) {
    return results.find((r) => /beach|oniru/i.test(r.title + r.neighbourhood));
  }
  if (/\bpool\b/i.test(lower)) {
    return results.find((r) => r.amenities.includes("pool") || /pool/i.test(r.title));
  }

  for (const r of results) {
    const hay = `${r.title} ${r.neighbourhood || ""} ${r.city}`.toLowerCase();
    const tokens = lower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3);
    const hits = tokens.filter((t) => hay.includes(t));
    if (hits.length >= 2 || (hits.length >= 1 && hay.includes(lower))) return r;
  }

  // Fuzzy title/neighbourhood contains
  for (const r of results) {
    const hay = `${r.title} ${r.neighbourhood || ""}`.toLowerCase();
    if (
      (/lekki/.test(lower) && /lekki/.test(hay)) ||
      (/oniru|beach/.test(lower) && /oniru|beach/.test(hay)) ||
      (/ikoyi/.test(lower) && /ikoyi/.test(hay)) ||
      (/yaba/.test(lower) && /yaba/.test(hay)) ||
      (/penthouse/.test(lower) && /penthouse/.test(hay)) ||
      (/villa/.test(lower) && /villa/.test(hay)) ||
      (/loft/.test(lower) && /loft/.test(hay))
    ) {
      return r;
    }
  }

  if (/\b(first|1st)\b/i.test(lower)) return results[0];
  if (/\b(second|2nd)\b/i.test(lower)) return results[1];
  if (/\b(third|3rd)\b/i.test(lower)) return results[2];
  if (/\b(that\s+one|this\s+one|yes|sounds\s+good|i'?ll\s+take\s+it|book\s+it)\b/i.test(lower) && results.length === 1)
    return results[0];

  return undefined;
}

function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (/\d/.test(t)) return false;
  if (/\b(book|lagos|dec|pay|card|crypto|bank|stay|shortlet)\b/i.test(t))
    return false;
  return /^[A-Za-z][A-Za-z\s'.-]+$/.test(t);
}

async function runSearch(s: Session) {
  try {
    const { results } = await searchListings({
      city: s.city,
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      guests: s.guests,
      kind: "STAY",
      limit: 12,
    });
    const cards = filterByPrefs(results.map(toCard), s);
    s.results = cards;
    s.phase = "showing";
    return cards;
  } catch (err) {
    console.error("[pellows.agent.search]", err);
    s.results = [];
    return [];
  }
}

async function createHoldAndPayLink(
  s: Session,
  phone: string,
): Promise<string> {
  const pick = s.selected!;
  const name = s.guestName || "Guest";
  const hold = (await invokeTool(
    "create_hold",
    {
      listingId: pick.id,
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      guests: s.guests,
      guestName: name,
      guestPhone: phone,
    },
    "WHATSAPP",
  )) as { bookingId: string; total: number; currency: string };

  // Default method CARD for intent; guest chooses on pay page
  const pay = (await invokeTool(
    "start_payment",
    { bookingId: hold.bookingId, method: "CARD" },
    "WHATSAPP",
  )) as { paymentIntentId: string };

  s.bookingId = hold.bookingId;
  s.paymentIntentId = pay.paymentIntentId;
  s.payUrl = `${appBaseUrl()}/pay/${pay.paymentIntentId}`;
  s.phase = "paying";

  const statusUrl = `${appBaseUrl()}/booking/${hold.bookingId}`;

  return (
    `You're set, ${name} ✅\n\n` +
    `*${pick.title}*\n` +
    `${s.checkIn} → ${s.checkOut} · ${s.guests} guests\n` +
    `Total ${money(hold.total, hold.currency)}\n\n` +
    `Pay in the app (card, bank, or crypto):\n${s.payUrl}\n\n` +
    `Track booking:\n${statusUrl}\n\n` +
    `Once it clears, your dates are locked.`
  );
}

export async function handleGuestMessageRules(input: {
  text: string;
  guestPhone: string;
  guestName?: string;
}): Promise<string> {
  const text = input.text.trim();
  const lower = text.toLowerCase();
  const s = getSession(input.guestPhone);
  if (input.guestName && !s.guestName) s.guestName = input.guestName;

  const decision = await decideGuestTurn({
    text,
    phase: s.phase,
    hasResults: s.results.length > 0,
    hasPayUrl: Boolean(s.payUrl),
  });

  const canned = replyForIntent(decision.intent);
  if (canned && (decision.intent === "how_it_works" || decision.intent === "holiday_expand" || decision.intent === "out_of_scope")) {
    return canned;
  }

  // Reset
  if (decision.intent === "reset") {
    sessions.set(input.guestPhone, {
      phase: "greeting",
      guests: 2,
      vibe: [],
      results: [],
    });
    return "Fresh start. Where do you want to stay, and for which dates?";
  }

  if (decision.intent === "start_book") {
    if (s.phase === "greeting") s.phase = "collecting";
    if (s.city && s.checkIn && s.checkOut) {
      return `You’re in booking mode — ${s.area || s.city}, ${s.checkIn} → ${s.checkOut}. Say “show me options” or tweak guests/vibe.`;
    }
    if (s.city) {
      return `Booking for *${s.city}* — which dates? (e.g. Dec 20–25 or Detty)`;
    }
    s.phase = "collecting";
    return "Let’s book. Drop city + dates in one line — e.g. “Lagos Dec 20–25 for 4” or “2 bed Lekki for Detty”.";
  }

  // Pay reminder
  if (s.phase === "paying" && s.payUrl) {
    if (decision.intent === "pay_status" || /\b(paid|done|sent|completed)\b/i.test(lower)) {
      if (/\b(paid|done|sent|completed)\b/i.test(lower)) {
        return `Nice — if the payment went through you’re confirmed. You can always reopen:\n${s.payUrl}`;
      }
      return `Pay here whenever you’re ready:\n${s.payUrl}\n\nCard, bank, or crypto — all in-app.`;
    }
  }

  if (s.phase === "naming") {
    if (looksLikeName(text)) {
      s.guestName = text.trim();
      return createHoldAndPayLink(s, input.guestPhone);
    }
    return "What name should I put on the booking?";
  }

  // Absorb info from every message
  absorb(text, s);

  // Greeting — don’t re-intro if we already started
  if (decision.intent === "greeting" || /^(hi|hello|hey|yo|good\s*(morning|evening|day))\b/i.test(text)) {
    const cold = s.phase === "greeting";
    if (cold) s.phase = "collecting";
    if (s.city || s.checkIn) {
      const need = missingPrompt(s);
      return need
        ? `Got it — still with you.\n\n${need}`
        : "Ready when you are — say “show me options” or tweak the vibe.";
    }
    if (!cold) {
      return "Still here. City + dates works best — e.g. “Lagos Dec 20–27 for 4” or “Accra for Detty”.";
    }
    return "Hey — I’m Pellows. I’ll help you find a short stay.\n\nWhere are you going, and roughly which dates? (Or say something like “2 bed Lekki Dec 20–27”.)";
  }

  // Selecting from shown results
  if (s.phase === "showing" && s.results.length) {
    const pick =
      decision.intent === "pick_stay" && decision.slots.pickIndex
        ? s.results[decision.slots.pickIndex - 1]
        : matchPick(text, s.results);
    if (pick) {
      s.selected = pick;
      if (!s.guestName) {
        s.phase = "naming";
        return (
          `Great choice — *${pick.title}* ` +
          `(${money(pick.basePrice, pick.currency)}/night).\n` +
          `${s.checkIn} → ${s.checkOut} for ${s.guests}.\n\n` +
          `What name should I put on the booking?`
        );
      }
      return createHoldAndPayLink(s, input.guestPhone);
    }
    // Refinement without pick
    if (
      decision.intent === "refine" ||
      parseVibe(text).length ||
      s.area ||
      /cheaper|different|else|other|more/i.test(lower)
    ) {
      const cards = await runSearch(s);
      if (!cards.length) {
        return "Nothing matched that tweak. Want to loosen the vibe or try another area?";
      }
      return (
        `Updated picks:\n\n${formatResults(cards)}\n\n` +
        `Which one feels right? You can say “the beach one”, “Lekki villa”, or “2”.`
      );
    }
  }

  // Ready to search?
  const need = missingPrompt({ ...s, phase: "collecting" });
  const canSearch = Boolean(s.city && s.checkIn && s.checkOut);
  if (!canSearch) {
    s.phase = "collecting";
    if (!s.city)
      return "Where should I look? Say a city (Lagos, Accra, Abuja…) or area (Lekki, VI).";
    if (!s.checkIn || !s.checkOut)
      return `Got *${s.city}*. Which dates — Dec 20–27, tomorrow, next weekend, or “Detty”?`;
    return need || "Tell me a bit more about the stay you want.";
  }

  // Known thin markets — acknowledge before hitting empty search
  if (/accra|ghana|kumasi/i.test(s.city || "")) {
    return (
      `*${s.city}* for ${s.checkIn} → ${s.checkOut} — heard you.\n\n` +
      `I don’t have LIVE Ghana inventory yet (Lagos shortlets are live today). ` +
      `Want Lagos Detty options while we onboard Accra hosts, or keep ${s.city} on the wishlist?`
    );
  }

  // Ask vibe once if never set and first search
  if (s.vibe.length === 0 && s.phase === "collecting" && !/any|whatever|surprise|just\s+show/i.test(lower)) {
    if (!parseVibe(text).length && !/show|find|search|available|options|moving|need|want/i.test(lower)) {
      s.phase = "collecting";
      return `${s.area || s.city} · ${s.checkIn} → ${s.checkOut} · ${s.guests} guests.\n\nWhat vibe — pool, beach, quiet, party-ready, or budget? Or say “show me options”.`;
    }
  }

  const cards = await runSearch(s);
  if (!cards.length) {
    const place = s.area || s.city;
    const isThinMarket = /accra|ghana|kumasi/i.test(place || "");
    if (isThinMarket) {
      return (
        `*${place}* for ${s.checkIn} → ${s.checkOut} — heard you loud and clear.\n\n` +
        `I don’t have LIVE Ghana inventory yet (Lagos shortlets are live today). ` +
        `Want Lagos Detty options while we onboard Accra hosts, or keep ${place} on the wishlist?`
      );
    }
    return `No live stays for ${place} on those dates. Try different dates or another city?`;
  }

  const vibeNote = s.vibe.length ? ` (${s.vibe.join(", ")})` : "";
  return (
    `Here are some stays in ${s.area || s.city}${vibeNote}:\n\n` +
    `${formatResults(cards)}\n\n` +
    `Which one do you like? Say something like “the beach one” or “number 2”.`
  );
}

/** LLM path — Gemini preferred (WhatsApp latency), else OpenAI / Meta. Same tools. */
export async function handleGuestMessageLlm(input: {
  text: string;
  guestPhone: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const pick = resolveGuestLlm();
  if (!pick) return handleGuestMessageRules(input);

  const base = appBaseUrl();

  try {
    const result = await generateText({
      model: pick.model,
      system: `You are Pellows, a warm short-stay booking agent (WhatsApp).
Have a natural conversation. Ask where, when, how many guests, and what vibe (pool, beach, quiet, budget).
NEVER invent stays - only tool results. Present 2-4 options in plain language.
When they pick one, create_hold then start_payment (method CARD).
Then reply with the pay link: ${base}/pay/{paymentIntentId}
Do NOT paste raw bank account numbers in chat. Payments happen in-app.
Amounts from tools are minor units - divide by 100 when speaking.
If they ask for flights or full holiday plans, acknowledge the vision and book the stay first.
Guest phone: ${input.guestPhone}
(Provider: ${pick.provider}/${pick.modelId})`,
      messages: [
        ...input.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: input.text },
      ],
      tools: {
        search_stays: tool({
          description: "Search live inventory",
          inputSchema: z.object({
            city: z.string().optional(),
            checkIn: z.string().optional(),
            checkOut: z.string().optional(),
            guests: z.number().int().optional(),
            q: z.string().optional(),
          }),
          execute: async (args) => {
            const raw = (await invokeTool(
              "search_stays",
              { ...args, kind: "STAY" },
              "WHATSAPP",
            )) as { results?: SearchHit[] };
            const hits = raw.results ?? [];
            const s = getSession(input.guestPhone);
            if (args.city) s.city = args.city;
            if (args.checkIn) s.checkIn = args.checkIn;
            if (args.checkOut) s.checkOut = args.checkOut;
            if (args.guests) s.guests = args.guests;
            const cards = hits.slice(0, 4).map(toCard);
            s.results = cards;
            s.phase = "showing";
            return { ...raw, results: cards };
          },
        }),
        create_hold: tool({
          description: "Hold dates",
          inputSchema: z.object({
            listingId: z.string(),
            checkIn: z.string(),
            checkOut: z.string(),
            guests: z.number().int(),
            guestName: z.string(),
          }),
          execute: async (args) =>
            invokeTool(
              "create_hold",
              { ...args, guestPhone: input.guestPhone },
              "WHATSAPP",
            ),
        }),
        start_payment: tool({
          description: "Create payment intent; guest pays in-app",
          inputSchema: z.object({
            bookingId: z.string(),
            method: z.enum(["CARD", "BANK_RAIL", "CRYPTO"]).default("CARD"),
          }),
          execute: async (args) => {
            const pay = (await invokeTool(
              "start_payment",
              args,
              "WHATSAPP",
            )) as { paymentIntentId: string };
            return {
              ...pay,
              payUrl: `${base}/pay/${pay.paymentIntentId}`,
            };
          },
        }),
      },
      stopWhen: stepCountIs(10),
    });

    return (
      result.text ||
      "Tell me where you want to stay and which dates - I will find options."
    );
  } catch (err) {
    console.error("[pellows.agent.llm]", pick.provider, err);
    return handleGuestMessageRules(input);
  }
}

export async function handleGuestMessage(input: {
  text: string;
  guestPhone: string;
  guestName?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}) {
  // Prefer LLM when a real key exists. Set PELLOWS_USE_LLM=0 to force rules.
  if (hasGuestLlm()) {
    return handleGuestMessageLlm({
      text: input.text,
      guestPhone: input.guestPhone,
      history: input.history ?? [],
    });
  }
  return handleGuestMessageRules(input);
}
