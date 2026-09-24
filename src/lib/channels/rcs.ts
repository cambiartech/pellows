import type { GuestTurn, SheetRow } from "@/lib/channels/types";

function card(row: SheetRow) {
  return {
    title: row.title.slice(0, 200),
    description: `${row.price} · ${row.subtitle}`.slice(0, 2000),
    ...(row.imageUrl
      ? {
          media: {
            height: "MEDIUM",
            contentInfo: { fileUrl: row.imageUrl, forceRefresh: false },
          },
        }
      : {}),
    suggestions: [
      {
        reply: {
          text: row.title.slice(0, 25),
          postbackData: row.id,
        },
      },
    ],
  };
}

/** Google Messages rich-card carousel. This is the native comparison sheet. */
export function rcsCarousel(header: string, rows: SheetRow[]) {
  return {
    contentMessage: {
      text: header,
      richCard: {
        carouselCard: {
          cardWidth: "MEDIUM",
          cardContents: rows.slice(0, 10).map(card),
        },
      },
    },
  };
}

export function rcsText(text: string) {
  return { contentMessage: { text: text.slice(0, 3072) } };
}

export function rcsUrlAction(label: string, url: string) {
  return {
    contentMessage: {
      text: label,
      suggestions: [
        {
          action: {
            text: label.slice(0, 25),
            postbackData: url,
            openUrlAction: { url },
          },
        },
      ],
    },
  };
}

export function rcsMessages(turn: GuestTurn) {
  const out: Record<string, unknown>[] = [rcsText(turn.text)];
  if (turn.sheet?.rows.length) {
    out.push(rcsCarousel(turn.sheet.header, turn.sheet.rows));
  }
  if (turn.pay) out.push(rcsUrlAction(turn.pay.label, turn.pay.url));
  if (turn.status) out.push(rcsUrlAction(turn.status.label, turn.status.url));
  return out;
}

/** Pub/Sub push or a direct RBM webhook. */
export function rcsInboundText(body: unknown): { from: string; text: string } | null {
  const event = unwrap(body);
  if (!event) return null;
  const from = String(event.senderPhoneNumber || event.from || "").replace(
    /^\+/,
    "",
  );
  const suggestionResponse = event.suggestionResponse as
    | { postbackData?: string }
    | undefined;
  const suggestion = suggestionResponse?.postbackData;
  const rawText = typeof event.text === "string" ? event.text : "";
  const text = (suggestion || rawText).trim();
  if (!from || !text) return null;
  const picked = suggestion?.startsWith("pick:")
    ? suggestion.replace("pick:", "")
    : text;
  return { from, text: picked };
}

function unwrap(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const root = body as { message?: { data?: string } };
  if (root.message?.data) {
    try {
      const json = Buffer.from(root.message.data, "base64").toString("utf8");
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return body as Record<string, unknown>;
}
