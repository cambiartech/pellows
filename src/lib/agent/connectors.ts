/**
 * Chat connectors — one conversation, many bookable things.
 *
 * Live connectors run search → hold → pay (stays today).
 * Pending connectors answer in-process with no LLM and no DB,
 * so "book a car" never waits on Gemini or a stay search.
 *
 * Add a vertical by registering it here and, when inventory exists,
 * flipping `live` and hanging tools off the shared invoke plane
 * (`src/lib/agent/tools.ts`) + the same payment intent.
 */

export type ConnectorId = "stays" | "cars" | "food" | "flights";

export type Connector = {
  id: ConnectorId;
  /** Inventory + tools are real. Pending connectors must not call the model. */
  live: boolean;
  matches: (text: string) => boolean;
  pendingReply: string;
};

const staySignal =
  /\b(stay|shortlet|short-let|apartment|villa|airbnb|flat|studio|bedroom|guest\s*house|lekki|ikoyi|victoria island|\bvi\b)\b/i;

const connectors: Connector[] = [
  {
    id: "cars",
    live: false,
    matches: (text) =>
      /\b(car hire|hire a car|rent(?:ing|ed)? (?:a |me )?(?:a )?cars?|cars? for rent|suv)\b/i.test(
        text,
      ) || /\b(need|want|book|get).{0,16}\bcars?\b/i.test(text),
    pendingReply:
      "Car hire is on the same chat — pick a car, hold it, pay in-app. Inventory isn’t connected yet, so I won’t invent a vehicle.\n\nI can book a *short stay* right now. City + dates and I’ll search live apartments.",
  },
  {
    id: "food",
    live: false,
    matches: (text) =>
      /\b(food|restaurant|bukka|chop|suya|jollof|dinner|lunch|breakfast|room service)\b/i.test(
        text,
      ),
    pendingReply:
      "Food from this chat is the plan — restaurant or delivery, then pay here. Menus aren’t live yet, so I won’t fake an order.\n\nWant a *stay* in the meantime? Tell me the city and dates.",
  },
  {
    id: "flights",
    live: false,
    matches: (text) =>
      /\b(flight|flights|airfare|airline)\b/i.test(text),
    pendingReply:
      "Flights belong in this same thread once a connector is live. I won’t invent a ticket.\n\nThe piece that books today is the *short stay*. Drop a city and dates.",
  },
];

/**
 * If the message is clearly a vertical we don't serve yet, return its
 * reply. Stay signals win so "apartment in Lekki and a car" still books the stay.
 */
export function pendingConnectorReply(text: string): string | null {
  if (staySignal.test(text)) return null;
  const hit = connectors.find((c) => !c.live && c.matches(text));
  return hit?.pendingReply ?? null;
}
