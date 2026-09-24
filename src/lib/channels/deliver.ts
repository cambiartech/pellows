import {
  sendWhatsAppCtaUrl,
  sendWhatsAppStayList,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { imessageMessages } from "@/lib/channels/imessage";
import { rcsMessages } from "@/lib/channels/rcs";
import type { ChannelId, DeliverResult, GuestTurn } from "@/lib/channels/types";

/**
 * Render one agent turn on the guest's app.
 * Missing credentials dry-run (logged) so local dev never throws.
 */
export async function deliverTurn(
  channel: ChannelId,
  to: string,
  turn: GuestTurn,
): Promise<DeliverResult> {
  if (channel === "whatsapp") return deliverWhatsApp(to, turn);
  if (channel === "imessage") return deliverJson("imessage", to, imessageMessages(turn), ambEndpoint());
  return deliverJson("rcs", to, rcsMessages(turn), rcsEndpoint());
}

async function deliverWhatsApp(to: string, turn: GuestTurn): Promise<DeliverResult> {
  const sent: string[] = [];
  const text = await sendWhatsAppText(to, turn.text);
  sent.push(text && "dryRun" in text && text.dryRun ? "text:dry" : "text");

  if (turn.sheet?.rows.length) {
    await sendWhatsAppStayList(
      to,
      turn.sheet.header,
      turn.sheet.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: `${r.price} · ${r.subtitle}`,
      })),
    );
    sent.push("list");
  }
  if (turn.pay) {
    await sendWhatsAppCtaUrl(to, "Secure your dates on Pellows.", turn.pay.label, turn.pay.url);
    sent.push("pay");
  }
  if (turn.status) {
    await sendWhatsAppCtaUrl(to, "Your booking.", turn.status.label, turn.status.url);
    sent.push("status");
  }
  return {
    channel: "whatsapp",
    dryRun: Boolean(text && "dryRun" in text && text.dryRun),
    sent,
  };
}

function ambEndpoint() {
  const url = process.env.AMB_MSP_URL?.trim();
  const token = process.env.AMB_MSP_TOKEN?.trim();
  const sourceId = process.env.AMB_BUSINESS_ID?.trim();
  if (!url || !token || !sourceId) return null;
  return { url, token, sourceId };
}

function rcsEndpoint() {
  const url = process.env.RCS_AGENT_URL?.trim();
  const token = process.env.RCS_AGENT_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token, sourceId: process.env.RCS_AGENT_ID?.trim() || "pellows" };
}

async function deliverJson(
  channel: "imessage" | "rcs",
  to: string,
  messages: Record<string, unknown>[],
  endpoint: { url: string; token: string; sourceId: string } | null,
): Promise<DeliverResult> {
  if (!endpoint) {
    console.log(`[pellows.${channel}.outbound.dry-run]`, { to, messages });
    return { channel, dryRun: true, sent: messages.map((_, i) => `dry:${i}`) };
  }

  const sent: string[] = [];
  for (const message of messages) {
    const body =
      channel === "imessage"
        ? {
            v: 1,
            sourceId: endpoint.sourceId,
            destinationId: to,
            id: `pel-${Date.now()}-${sent.length}`,
            ...message,
          }
        : { ...message, to: to.startsWith("+") ? to : `+${to}` };

    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${endpoint.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${channel} send failed: ${res.status} ${err.slice(0, 180)}`);
    }
    sent.push("ok");
  }
  return { channel, dryRun: false, sent };
}
