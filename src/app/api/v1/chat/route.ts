import { NextResponse } from "next/server";
import { z } from "zod";
import {
  handleGuestMessage,
  hydrateGuestSession,
  peekGuestSession,
} from "@/lib/agent/guest-agent";
import {
  loadConversationState,
  loadLastBooking,
  saveConversationState,
} from "@/lib/agent/memory";
import {
  appendMessage,
  getOrCreateWaConversation,
} from "@/lib/whatsapp";
import { prisma } from "@/lib/db";
import { optionSheetHeader, optionSheetRows } from "@/lib/agent/option-sheet";

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
    let lastBooking = null as Awaited<ReturnType<typeof loadLastBooking>>;

    try {
      const { conversation } = await getOrCreateWaConversation(waPhone);
      conversationId = conversation.id;
      const saved = await loadConversationState(conversation.id);
      hydrateGuestSession(guestPhone, saved);
      lastBooking = await loadLastBooking(waPhone);
      await appendMessage(conversation.id, "user", body.text);
      const recent = await prisma.agentMessage.findMany({
        where: {
          conversationId: conversation.id,
          role: { in: ["user", "assistant"] },
        },
        orderBy: { createdAt: "desc" },
        take: 16,
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
      lastBooking,
    });

    const session = peekGuestSession(guestPhone);
    if (conversationId) {
      try {
        await appendMessage(conversationId, "assistant", reply);
        if (session) await saveConversationState(conversationId, session);
      } catch {
        /* ignore persist failure */
      }
    }

    const ui: {
      buttons?: { id: string; title: string }[];
      query?: string;
      stays?: {
        id: string;
        title: string;
        price: string;
        meta: string;
        photoUrl?: string;
      }[];
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
      ui.query = optionSheetHeader(session);
      ui.stays = optionSheetRows(session.results);
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
