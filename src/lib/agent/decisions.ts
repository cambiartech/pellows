/**
 * Decision layer — structured routing for the guest agent.
 *
 * Architecture (holiday OS ready):
 * - Jev / System One (TypeSafe): typed intents + slots + confidence — no chat strings
 * - LLM (OpenAI / Meta): warm reply copy + tool orchestration when needed
 * - Rules: deterministic fallback (always works offline)
 *
 * Jev docs: https://docs.typesafe.ai/
 * Jev is NOT a chat model — it classifies/routes; we still need LLM or templates to speak.
 */

export type GuestIntent =
  | "greeting"
  | "start_book"
  | "how_it_works"
  | "search_stay"
  | "pick_stay"
  | "refine"
  | "pay_status"
  | "holiday_expand" // flights / tours — acknowledge, redirect to stay for now
  | "out_of_scope"
  | "reset";

export type GuestSlots = {
  city?: string;
  area?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  pickIndex?: number;
  vibe?: string[];
};

export type Decision = {
  intent: GuestIntent;
  confidence: number;
  slots: GuestSlots;
  provider: "rules" | "jev" | "llm";
};

type DecideInput = {
  text: string;
  phase?: string;
  hasResults?: boolean;
  hasPayUrl?: boolean;
};

function rulesDecide(input: DecideInput): Decision {
  const text = input.text.trim();
  const lower = text.toLowerCase();

  if (/^(reset|start over|new search)\b/i.test(text)) {
    return { intent: "reset", confidence: 0.99, slots: {}, provider: "rules" };
  }

  if (text === "start:book" || /^(find a stay|book|get started)\b/i.test(lower)) {
    return { intent: "start_book", confidence: 0.95, slots: {}, provider: "rules" };
  }
  if (text === "start:help" || /how (it|does|do).*(work|book)/i.test(lower)) {
    return {
      intent: "how_it_works",
      confidence: 0.9,
      slots: {},
      provider: "rules",
    };
  }

  if (
    /\b(flight|flights|airfare|airline|visa|hotel chain)\b/i.test(
      lower,
    )
  ) {
    return {
      intent: "holiday_expand",
      confidence: 0.85,
      slots: {},
      provider: "rules",
    };
  }

  if (input.hasPayUrl && /\b(paid|pay|payment|link|card|bank|crypto|done|sent)\b/i.test(lower)) {
    return { intent: "pay_status", confidence: 0.9, slots: {}, provider: "rules" };
  }

  if (input.hasResults) {
    const m =
      text.match(/\b(?:book|option|number|pick|choose|#)?\s*(\d+)\b/i) ||
      text.match(/^(\d+)$/);
    if (m) {
      return {
        intent: "pick_stay",
        confidence: 0.92,
        slots: { pickIndex: Number(m[1]) },
        provider: "rules",
      };
    }
    if (/cheaper|different|else|other|more|another/i.test(lower)) {
      return { intent: "refine", confidence: 0.8, slots: {}, provider: "rules" };
    }
  }

  if (/^(hi|hello|hey|yo|good\s*(morning|evening|day)|sup)\b/i.test(text)) {
    return { intent: "greeting", confidence: 0.95, slots: {}, provider: "rules" };
  }

  if (
    /\b(stay|shortlet|apartment|villa|airbnb|book|detty|lekki|ikoyi|lagos|abuja)\b/i.test(
      lower,
    ) ||
    /\b(dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov)\b/i.test(lower) ||
    /\d{4}-\d{2}-\d{2}/.test(text)
  ) {
    return { intent: "search_stay", confidence: 0.75, slots: {}, provider: "rules" };
  }

  return { intent: "search_stay", confidence: 0.4, slots: {}, provider: "rules" };
}

/**
 * Optional Jev path when TYPESAFE_API_KEY is set.
 * Early access model — fail soft to rules if unavailable.
 * @see https://typesafe.ai/blog/introducing-system-one-models-and-jev
 */
async function jevDecide(input: DecideInput): Promise<Decision | null> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key || process.env.PELLOWS_USE_JEV !== "1") return null;

  try {
    // Placeholder shape — swap for live TypeSafe SDK / HTTP when key is live.
    // Jev: state + Choice questions → typed intent (no free-text hallucination).
    const res = await fetch("https://api.typesafe.ai/v1/decide", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jev",
        state: {
          text: input.text,
          phase: input.phase ?? null,
          hasResults: Boolean(input.hasResults),
          hasPayUrl: Boolean(input.hasPayUrl),
          product: "pellows_shortstay",
        },
        questions: [
          {
            type: "Choice",
            key: "intent",
            options: [
              "greeting",
              "start_book",
              "how_it_works",
              "search_stay",
              "pick_stay",
              "refine",
              "pay_status",
              "holiday_expand",
              "out_of_scope",
              "reset",
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      answers?: { intent?: { choice?: string; confidence?: number } };
    };
    const choice = data.answers?.intent?.choice as GuestIntent | undefined;
    const confidence = data.answers?.intent?.confidence ?? 0.7;
    if (!choice) return null;
    return {
      intent: choice,
      confidence,
      slots: rulesDecide(input).slots,
      provider: "jev",
    };
  } catch {
    return null;
  }
}

export async function decideGuestTurn(input: DecideInput): Promise<Decision> {
  const jev = await jevDecide(input);
  if (jev && jev.confidence >= 0.55) return jev;
  return rulesDecide(input);
}

export function replyForIntent(intent: GuestIntent): string | null {
  switch (intent) {
    case "how_it_works":
      return (
        "Here’s the loop:\n\n" +
        "1. Tell me *where* + *dates* (+ guests / vibe)\n" +
        "2. I search *live* agency inventory (no fake rooms)\n" +
        "3. You pick → I hold the dates → you pay in-app\n" +
        "4. Confirmed → you’re set\n\n" +
        "Try: “2 bed Lekki Dec 20–27” or tap *Find a stay*."
      );
    case "holiday_expand":
      return (
        "That belongs in this same chat once the connector is live — I won’t invent a flight, car, or table.\n\n" +
        "What books today is the *short stay*. Drop a city and dates."
      );
    case "out_of_scope":
      return (
        "I’m best at short stays (Lagos first). Say a city and dates — or “Find a stay” — and I’ll get moving."
      );
    default:
      return null;
  }
}
