import { prisma } from "@/lib/db";

export type WaDebugEvent = {
  at: string;
  method: "GET" | "POST";
  summary: string;
  from?: string;
  text?: string;
  replied?: boolean;
  error?: string;
  llm?: string;
};

const DEBUG_EXTERNAL_ID = "wa:__debug__";

async function getDebugConversation() {
  let guest = await prisma.guest.findUnique({
    where: { whatsappId: "__debug__" },
  });
  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        whatsappId: "__debug__",
        phone: "+00000000000",
        name: "Webhook debug",
      },
    });
  }

  let conversation = await prisma.conversation.findUnique({
    where: { externalId: DEBUG_EXTERNAL_ID },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        guestId: guest.id,
        channel: "WHATSAPP",
        externalId: DEBUG_EXTERNAL_ID,
      },
    });
  }
  return conversation;
}

export async function recordWaDebug(ev: WaDebugEvent) {
  try {
    const conversation = await getDebugConversation();
    await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: "system",
        content: JSON.stringify(ev),
        toolName: "wa_debug",
      },
    });
  } catch (err) {
    console.error("[pellows.wa-debug.persist]", err);
  }
}

export async function listWaDebug(limit = 30): Promise<WaDebugEvent[]> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { externalId: DEBUG_EXTERNAL_ID },
    });
    if (!conversation) return [];

    const rows = await prisma.agentMessage.findMany({
      where: { conversationId: conversation.id, toolName: "wa_debug" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((r) => {
      try {
        return JSON.parse(r.content) as WaDebugEvent;
      } catch {
        return {
          at: r.createdAt.toISOString(),
          method: "POST" as const,
          summary: r.content.slice(0, 120),
        };
      }
    });
  } catch (err) {
    console.error("[pellows.wa-debug.list]", err);
    return [];
  }
}
