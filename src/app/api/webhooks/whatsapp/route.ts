import { NextResponse } from "next/server";
import {
  appendMessage,
  conversationHasAssistant,
  getOrCreateWaConversation,
  sendWhatsAppCtaUrl,
  sendWhatsAppStayGallery,
  sendWhatsAppText,
  sendWhatsAppTyping,
  sendWhatsAppWelcome,
} from "@/lib/whatsapp";
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
import { prisma } from "@/lib/db";
import { recordWaDebug } from "@/lib/wa-debug";
import { dualPriceLabel } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? "pellows-dev-verify";

  if (mode === "subscribe" && token === expected && challenge) {
    await recordWaDebug({
      at: new Date().toISOString(),
      method: "GET",
      summary: "verify_ok",
    });
    return new NextResponse(challenge, { status: 200 });
  }
  await recordWaDebug({
    at: new Date().toISOString(),
    method: "GET",
    summary: "verify_forbidden",
  });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type WaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    list_reply?: { id?: string; title?: string };
    button_reply?: { id?: string; title?: string };
  };
};

function extractInboundText(message: WaMessage): string | null {
  if (message.type === "text" && message.text?.body) {
    return message.text.body.trim();
  }
  if (message.type === "interactive") {
    const btnId = message.interactive?.button_reply?.id;
    if (btnId?.startsWith("start:")) return btnId;
    const listId = message.interactive?.list_reply?.id;
    if (listId?.startsWith("pick:")) {
      return listId.replace("pick:", "");
    }
    const title =
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title;
    if (title) return title.trim();
    if (listId) return listId;
  }
  return null;
}

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0] as WaMessage | undefined;
    const contactName = value?.contacts?.[0]?.profile?.name as
      | string
      | undefined;
    const statuses = value?.statuses;

    if (statuses?.length && !message) {
      await recordWaDebug({
        at: new Date().toISOString(),
        method: "POST",
        summary: `status:${statuses[0]?.status ?? "unknown"}`,
      });
      return NextResponse.json({ ok: true });
    }

    const text = message ? extractInboundText(message) : null;

    if (message?.from && text) {
      const waPhone = message.from;
      const guestPhone = waPhone.startsWith("+") ? waPhone : `+${waPhone}`;

      if (message.id) {
        try {
          await sendWhatsAppTyping(message.id);
        } catch (err) {
          console.error("[pellows.whatsapp.typing]", err);
        }
      }

      const { conversation } = await getOrCreateWaConversation(waPhone);
      const saved = await loadConversationState(conversation.id);
      hydrateGuestSession(guestPhone, saved);
      const lastBooking = await loadLastBooking(waPhone);
      const isCold = !(await conversationHasAssistant(conversation.id));

      await appendMessage(conversation.id, "user", text);

      // Welcome buttons on first hello — NEVER skip the text reply if this fails
      if (isCold && /^(hi|hello|hey|yo)\b/i.test(text)) {
        try {
          await sendWhatsAppWelcome(waPhone, contactName);
          await appendMessage(
            conversation.id,
            "assistant",
            "[welcome interactive]",
          );
        } catch (err) {
          console.error("[pellows.whatsapp.welcome]", err);
        }
      }

      const recent = await prisma.agentMessage.findMany({
        where: {
          conversationId: conversation.id,
          role: { in: ["user", "assistant"] },
        },
        orderBy: { createdAt: "desc" },
        take: 16,
      });
      const history = recent
        .reverse()
        .filter((m) => m.content !== "[welcome interactive]")
        .slice(0, -1)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      let reply: string;
      try {
        reply = await handleGuestMessage({
          text,
          guestPhone,
          guestName: contactName,
          history,
          lastBooking,
        });
      } catch (err) {
        console.error("[pellows.whatsapp.agent]", err);
        reply =
          "I’m here — had a hiccup. Tell me city + dates (e.g. Lekki Dec 20–27) and I’ll find stays.";
      }

      await appendMessage(conversation.id, "assistant", reply);

      const session = peekGuestSession(guestPhone);
      if (session) {
        await saveConversationState(conversation.id, session);
      }

      let sent;
      try {
        sent = await sendWhatsAppText(waPhone, reply);
      } catch (err) {
        console.error("[pellows.whatsapp.text]", err);
        await recordWaDebug({
          at: new Date().toISOString(),
          method: "POST",
          summary: "send_text_failed",
          from: waPhone,
          text: text.slice(0, 80),
          error: err instanceof Error ? err.message.slice(0, 160) : "send failed",
          replied: false,
        });
        return NextResponse.json({ ok: true });
      }

      if (session?.phase === "showing" && session.results.length > 0) {
        try {
          await sendWhatsAppStayGallery(
            waPhone,
            session.results.map((r, i) => {
              const price = dualPriceLabel(r.basePrice, r.currency);
              return {
                id: `pick:${i + 1}`,
                title: `${i + 1}. ${(r.neighbourhood || r.city).slice(0, 18)}`,
                description: `${price.usd || price.primary}/night · ${r.title}`.slice(
                  0,
                  72,
                ),
                photoUrl: r.photoUrl,
              };
            }),
            "Tap a stay to continue booking:",
          );
        } catch (err) {
          console.error("[pellows.whatsapp.list]", err);
        }
      }
      if (session?.phase === "paying" && session.payUrl) {
        try {
          await sendWhatsAppCtaUrl(
            waPhone,
            "Secure your dates — card (USD), bank, or crypto on Pellows.",
            "Pay now",
            session.payUrl,
          );
        } catch (err) {
          console.error("[pellows.whatsapp.cta]", err);
        }
      }

      await recordWaDebug({
        at: new Date().toISOString(),
        method: "POST",
        summary:
          sent && "dryRun" in sent && sent.dryRun
            ? "text_dry_run"
            : "text_replied",
        from: waPhone,
        text: text.slice(0, 80),
        replied: !(sent && "dryRun" in sent && sent.dryRun),
      });
    } else {
      await recordWaDebug({
        at: new Date().toISOString(),
        method: "POST",
        summary: `ignored type=${message?.type ?? "none"}`,
        from: message?.from,
      });
    }
  } catch (err) {
    console.error("[pellows.whatsapp.error]", err);
    await recordWaDebug({
      at: new Date().toISOString(),
      method: "POST",
      summary: "error",
      error: err instanceof Error ? err.message.slice(0, 160) : "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
