import { prisma } from "@/lib/db";
import { appendMessage } from "@/lib/whatsapp";
import {
  handleGuestMessage,
  hydrateGuestSession,
  peekGuestSession,
} from "@/lib/agent/guest-agent";
import {
  loadLastBooking,
  saveConversationState,
} from "@/lib/agent/memory";
import { deliverTurn } from "@/lib/channels/deliver";
import { guestTurnFromSession } from "@/lib/channels/turn";
import type { ChannelId } from "@/lib/channels/types";

/**
 * Same agent for every inbox.
 * WhatsApp keeps its own webhook (typing, welcome, Meta verify).
 * iMessage and RCS call this once a message is authenticated.
 */
export async function runChannelInbound(input: {
  channel: Exclude<ChannelId, "whatsapp">;
  userKey: string;
  text: string;
  guestName?: string;
}) {
  const thread = await openThread(input.channel, input.userKey);
  const { conversation } = thread;
  const saved = conversation.state as Parameters<typeof hydrateGuestSession>[1];
  if (saved) hydrateGuestSession(thread.agentKey, saved);

  const history = (
    await prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 24,
    })
  )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const lastBooking = thread.agentKey.startsWith("+")
    ? await loadLastBooking(thread.agentKey).catch(() => null)
    : null;

  await appendMessage(conversation.id, "user", input.text);

  const reply = await handleGuestMessage({
    text: input.text,
    guestPhone: thread.agentKey,
    guestName: input.guestName,
    history,
    lastBooking,
  });

  await appendMessage(conversation.id, "assistant", reply);
  const session = peekGuestSession(thread.agentKey);
  if (session) await saveConversationState(conversation.id, session);

  const turn = guestTurnFromSession(reply, session);
  const delivered = await deliverTurn(input.channel, input.userKey, turn);
  if (session?.bookingStatusUrl) {
    session.bookingStatusUrl = undefined;
    await saveConversationState(conversation.id, session);
  }
  return { reply, delivered };
}

async function openThread(channel: "imessage" | "rcs", userKey: string) {
  const externalId = `${channel}:${userKey}`;
  const agentKey =
    channel === "rcs" ? `+${userKey.replace(/^\+/, "")}` : `imessage:${userKey}`;

  let guest =
    channel === "rcs"
      ? await prisma.guest.findUnique({ where: { phone: agentKey } })
      : await prisma.guest.findUnique({ where: { whatsappId: externalId } });

  if (!guest) {
    guest = await prisma.guest.create({
      data:
        channel === "rcs"
          ? { phone: agentKey, name: null }
          : { whatsappId: externalId, name: null },
    });
  }

  let conversation = await prisma.conversation.findUnique({
    where: { externalId },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        guestId: guest.id,
        channel: channel === "rcs" ? "RCS" : "IMESSAGE",
        externalId,
      },
    });
  }
  return { guest, conversation, agentKey };
}
