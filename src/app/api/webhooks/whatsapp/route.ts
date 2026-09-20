import { NextResponse } from "next/server";
import {
  appendMessage,
  getOrCreateWaConversation,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { handleGuestMessage } from "@/lib/agent/guest-agent";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? "pellows-dev-verify";

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WaMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  profile?: { name?: string };
};

export async function POST(request: Request) {
  const payload = await request.json();

  // Acknowledge Meta immediately; process then reply
  try {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0] as WaMessage | undefined;
    const contactName = value?.contacts?.[0]?.profile?.name as
      | string
      | undefined;

    if (message?.type === "text" && message.text?.body && message.from) {
      const waPhone = message.from;
      const text = message.text.body.trim();
      const { conversation } = await getOrCreateWaConversation(waPhone);

      await appendMessage(conversation.id, "user", text);

      const recent = await prisma.agentMessage.findMany({
        where: {
          conversationId: conversation.id,
          role: { in: ["user", "assistant"] },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      const history = recent
        .reverse()
        .slice(0, -1) // exclude the message we just added from duplicate
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const reply = await handleGuestMessage({
        text,
        guestPhone: waPhone.startsWith("+") ? waPhone : `+${waPhone}`,
        guestName: contactName,
        history,
      });

      await appendMessage(conversation.id, "assistant", reply);
      await sendWhatsAppText(waPhone, reply);
    }
  } catch (err) {
    console.error("[pellows.whatsapp.error]", err);
  }

  return NextResponse.json({ ok: true });
}
