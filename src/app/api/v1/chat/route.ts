import { NextResponse } from "next/server";
import { z } from "zod";
import {
  handleGuestMessage,
  peekGuestSession,
} from "@/lib/agent/guest-agent";
import {
  appendMessage,
  getOrCreateWaConversation,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/db";
import { dualPriceLabel } from "@/lib/money";

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
    const guestPhone = `+${waPhone}`;

    let history: { role: "user" | "assistant"; content: string }[] = [];
    let conversationId: string | null = null;

    try {
      const { conversation } = await getOrCreateWaConversation(waPhone);
      conversationId = conversation.id;
      await appendMessage(conversation.id, "user", body.text);
      const recent = await prisma.agentMessage.findMany({
        where: {
          conversationId: conversation.id,
          role: { in: ["user", "assistant"] },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      history = recent
        .reverse()
        .slice(0, -1)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
    } catch (dbErr) {
      console.warn(
        "[pellows.chat.db]",
        dbErr instanceof Error ? dbErr.message : dbErr,
      );
    }

    const reply = await handleGuestMessage({
      text: body.text,
      guestPhone,
      guestName: body.name,
      history,
    });

    if (conversationId) {
      try {
        await appendMessage(conversationId, "assistant", reply);
      } catch {
        /* ignore persist failure */
      }
    }

    const session = peekGuestSession(guestPhone);
    const ui: {
      buttons?: { id: string; title: string }[];
  stays?: { id: string; title: string; description: string; photoUrl?: string }[];
  payUrl?: string;
  phase?: string;
    } = { phase: session?.phase };

    if (session?.phase === "greeting") {
      ui.buttons = [
        { id: "start:book", title: "Find a stay" },
        { id: "start:help", title: "How it works" },
      ];
    }
    if (session?.phase === "showing" && session.results.length) {
      ui.stays = session.results.map((r, i) => {
        const price = dualPriceLabel(r.basePrice, r.currency);
        return {
          id: String(i + 1),
          title: `${i + 1}. ${(r.neighbourhood || r.city).slice(0, 22)}`,
          description: `${price.usd || price.primary}/night`,
          photoUrl: r.photoUrl || undefined,
        };
      });
    }
    if (session?.phase === "paying" && session.payUrl) {
      ui.payUrl = session.payUrl;
      ui.buttons = [{ id: "pay", title: "Pay now" }];
    }

    return NextResponse.json({
      reply,
      conversationId,
      ui,
      offline: !conversationId,
    });
  } catch (err) {
    console.error("[pellows.chat]", err);
    const raw = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: raw }, { status: 400 });
  }
}
