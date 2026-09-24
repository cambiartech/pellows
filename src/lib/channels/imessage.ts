import type { GuestTurn, SheetRow } from "@/lib/channels/types";

const LIST_PICKER_BID =
  "com.apple.messages.MSMessageExtensionBalloonPlugin:0000000000:com.apple.icloud.apps.messages.business.extension";

/** Apple Messages for Business list picker — the inline comparison sheet. */
export function imessageListPicker(header: string, rows: SheetRow[]) {
  return {
    type: "interactive" as const,
    interactiveData: {
      bid: LIST_PICKER_BID,
      data: {
        mspVersion: "1.0",
        requestIdentifier: `stays-${Date.now()}`,
        listPicker: {
          sections: [
            {
              title: "Stays",
              multipleSelection: false,
              items: rows.slice(0, 10).map((r) => ({
                identifier: r.id,
                title: r.title.slice(0, 512),
                subtitle: `${r.price} · ${r.subtitle}`.slice(0, 512),
                ...(r.imageUrl ? { imageIdentifier: r.imageUrl } : {}),
              })),
            },
          ],
        },
      },
      receivedMessage: { title: header.slice(0, 512) },
      replyMessage: { title: "Stay selected" },
    },
  };
}

/** Rich link until an Apple Pay merchant id is configured. No fake Pay sheet. */
export function imessageRichLink(title: string, url: string) {
  return {
    type: "richLink" as const,
    richLinkData: { title: title.slice(0, 512), url },
  };
}

export function imessageMessages(turn: GuestTurn) {
  const out: Record<string, unknown>[] = [{ type: "text", body: turn.text }];
  if (turn.sheet?.rows.length) {
    out.push(imessageListPicker(turn.sheet.header, turn.sheet.rows));
  }
  if (turn.pay) out.push(imessageRichLink(turn.pay.label, turn.pay.url));
  if (turn.status) out.push(imessageRichLink(turn.status.label, turn.status.url));
  return out;
}

/**
 * Pull the guest's text or list-picker id out of an MSP-forwarded Apple message.
 * Returns null for typing/close events we should ignore.
 */
export function imessageInboundText(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const msg = body as {
    type?: string;
    body?: string;
    interactiveData?: {
      data?: {
        listPicker?: {
          sections?: { items?: { identifier?: string }[] }[];
        };
      };
    };
  };
  if (msg.type === "text" && msg.body?.trim()) return msg.body.trim();
  const items =
    msg.interactiveData?.data?.listPicker?.sections?.flatMap(
      (s) => s.items || [],
    ) || [];
  const id = items.find((i) => i.identifier)?.identifier;
  if (id?.startsWith("pick:")) return id.replace("pick:", "");
  return null;
}
