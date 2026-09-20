import { prisma } from "@/lib/db";

export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log("[pellows.whatsapp.outbound.dry-run]", { to, body });
    return { dryRun: true as const };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: body.slice(0, 4096) },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[pellows.whatsapp.outbound.error]", err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }
  return { dryRun: false as const, ...(await res.json()) };
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
