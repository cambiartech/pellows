import { NextResponse } from "next/server";
import { z } from "zod";
import { handleGuestMessage } from "@/lib/agent/guest-agent";
import {
  appendMessage,
  getOrCreateWaConversation,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(5).default("2348000000001"),
  text: z.string().min(1),
  name: z.string().optional(),
});

/** Local WhatsApp simulator — no Meta credentials required. */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const waPhone = body.phone.replace(/^\+/, "");
    const { conversation } = await getOrCreateWaConversation(waPhone);
    await appendMessage(conversation.id, "user", body.text);

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
      .slice(0, -1)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const reply = await handleGuestMessage({
      text: body.text,
      guestPhone: `+${waPhone}`,
      guestName: body.name,
      history,
    });
    await appendMessage(conversation.id, "assistant", reply);

    return NextResponse.json({ reply, conversationId: conversation.id });
  } catch (err) {
    console.error("[pellows.chat]", err);
    const raw = err instanceof Error ? err.message : "Chat failed";
    const message =
      /Authentication failed|DATABASE_URL|password authentication/i.test(raw)
        ? "Database connection failed. Check DATABASE_URL / DIRECT_URL on Netlify (Neon password may have been rotated)."
        : raw;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
