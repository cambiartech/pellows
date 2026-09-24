import { prisma } from "@/lib/db";

type WaSendResult =
  | { dryRun: true }
  | { dryRun: false; [key: string]: unknown };

async function graphSend(body: Record<string, unknown>): Promise<WaSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log("[pellows.whatsapp.outbound.dry-run]", body);
    return { dryRun: true };
  }

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...body,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[pellows.whatsapp.outbound.error]", err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
  return { dryRun: false, ...(await res.json()) };
}

/** Blue ticks + … typing while we think (dismisses on reply or ~25s). */
export async function sendWhatsAppTyping(messageId: string) {
  if (!messageId) return { dryRun: true as const };
  return graphSend({
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  });
}

export async function sendWhatsAppText(to: string, body: string) {
  return graphSend({
    to,
    type: "text",
    text: { body: body.slice(0, 4096) },
  });
}

/** Image by public HTTPS URL (listing photos). */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string,
) {
  return graphSend({
    to,
    type: "image",
    image: {
      link: imageUrl,
      ...(caption ? { caption: caption.slice(0, 1024) } : {}),
    },
  });
}

/** Send up to 4 stay photos then the pick list. */
export async function sendWhatsAppStayGallery(
  to: string,
  stays: {
    id: string;
    title: string;
    description?: string;
    photoUrl?: string | null;
  }[],
  listBody: string,
) {
  const withPhotos = stays.filter((s) => s.photoUrl).slice(0, 4);
  for (const s of withPhotos) {
    try {
      await sendWhatsAppImage(
        to,
        s.photoUrl!,
        `${s.title}${s.description ? `\n${s.description}` : ""}`,
      );
    } catch (err) {
      console.error("[pellows.whatsapp.image]", err);
    }
  }
  return sendWhatsAppStayList(
    to,
    listBody,
    stays.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
    })),
  );
}

/** OWO-style welcome: body + reply buttons (Flows come next for forms). */
export async function sendWhatsAppWelcome(to: string, guestName?: string) {
  const hi = guestName ? `Hi ${guestName.split(" ")[0]}` : "Hey";
  return graphSend({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: "Welcome to Pellows",
      },
      body: {
        text: (
          `${hi} — I’m your short-stay booking agent.\n\n` +
          `Tell me a city + dates (or tap below) and I’ll find live inventory, hold your dates, and send a pay link.\n\n` +
          `Flights, tours, and full-holiday planning are coming — today we nail the stay.`
        ).slice(0, 1024),
      },
      footer: { text: "From chat to keys" },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "start:book", title: "Find a stay" },
          },
          {
            type: "reply",
            reply: { id: "start:help", title: "How it works" },
          },
        ],
      },
    },
  });
}

/** Interactive list — guest taps a stay (id = pick:1 … pick:4). */
export async function sendWhatsAppStayList(
  to: string,
  bodyText: string,
  rows: { id: string; title: string; description?: string }[],
) {
  const safeRows = rows.slice(0, 10).map((r) => ({
    id: r.id.slice(0, 200),
    title: r.title.slice(0, 24),
    ...(r.description
      ? { description: r.description.slice(0, 72) }
      : {}),
  }));

  return graphSend({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText.slice(0, 1024) },
      action: {
        button: "See stays",
        sections: [
          {
            title: "Available stays",
            rows: safeRows,
          },
        ],
      },
    },
  });
}

/** CTA URL button — open pay / booking status. */
export async function sendWhatsAppCtaUrl(
  to: string,
  bodyText: string,
  displayText: string,
  url: string,
) {
  return graphSend({
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: bodyText.slice(0, 1024) },
      action: {
        name: "cta_url",
        parameters: {
          display_text: displayText.slice(0, 20),
          url,
        },
      },
    },
  });
}

export async function getOrCreateWaConversation(waPhone: string) {
  let guest = await prisma.guest.findUnique({ where: { whatsappId: waPhone } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        whatsappId: waPhone,
        phone: `+${waPhone.replace(/^\+/, "")}`,
        name: null,
      },
    });
  }

  let conversation = await prisma.conversation.findUnique({
    where: { externalId: `wa:${waPhone}` },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        guestId: guest.id,
        channel: "WHATSAPP",
        externalId: `wa:${waPhone}`,
      },
    });
  }
  return { guest, conversation };
}

export async function appendMessage(
  conversationId: string,
  role: string,
  content: string,
  toolName?: string,
  toolPayload?: unknown,
) {
  return prisma.agentMessage.create({
    data: {
      conversationId,
      role,
      content,
      toolName,
      toolPayload: toolPayload as object | undefined,
    },
  });
}

export async function conversationHasAssistant(conversationId: string) {
  const n = await prisma.agentMessage.count({
    where: { conversationId, role: "assistant" },
  });
  return n > 0;
}
