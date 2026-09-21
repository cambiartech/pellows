"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  buttons?: { id: string; title: string }[];
  stays?: { id: string; title: string; description: string; photoUrl?: string }[];
  payUrl?: string;
};

const SUGGESTIONS = [
  "I am moving to Ghana for Detty December",
  "Lagos Dec 20-27 for 4",
  "Something with a pool in Lekki",
  "show me options",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPage() {
  const [phone] = useState(() => `2348${Date.now().toString().slice(-8)}`);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      at: Date.now(),
      content:
        "Welcome to Pellows — short-stay booking from chat.\n\nTap below or tell me city + dates.",
      buttons: [
        { id: "start:book", title: "Find a stay" },
        { id: "start:help", title: "How it works" },
      ],
    },
  ]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const send = useCallback(
    async (raw?: string, displayAs?: string) => {
      const trimmed = (raw ?? text).trim();
      if (!trimmed || busy) return;
      const shown = (displayAs ?? trimmed).trim();
      setText("");
      setMessages((m) => [
        ...m,
        { id: uid(), role: "user", content: shown, at: Date.now() },
      ]);
      setBusy(true);
      try {
        const res = await fetch("/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            text: trimmed,
            name: "Detty Guest",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        const ui = data.ui as {
          buttons?: Msg["buttons"];
          stays?: Msg["stays"];
          payUrl?: string;
        } | undefined;
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: data.reply as string,
            at: Date.now(),
            buttons: ui?.buttons,
            stays: ui?.stays,
            payUrl: ui?.payUrl,
          },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            content: e instanceof Error ? e.message : "Chat error",
            at: Date.now(),
          },
        ]);
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [text, busy, phone],
  );

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#efebe3",
        padding: "6.5rem 1rem 1.5rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          height: "calc(100svh - 8rem)",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          borderRadius: 28,
          overflow: "hidden",
          background: "#0b141a",
          border: "1px solid rgba(0,0,0,0.2)",
          boxShadow: "0 24px 64px rgba(22,20,18,0.28)",
          color: "#e9edef",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "#1f2c34",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "#0b5552",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 500,
              color: "#f3efe6",
            }}
          >
            P
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
              Pellows
            </div>
            <div style={{ fontSize: 12, color: "#8696a0" }}>
              {busy ? "typing…" : "online · booking agent"}
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8696a0",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            Sim
          </span>
        </div>

        <div
          ref={scrollerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 12px",
            background: "#0b141a",
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <span
              style={{
                fontSize: 11,
                color: "#8696a0",
                background: "#182229",
                borderRadius: 999,
                padding: "6px 12px",
              }}
            >
              Local sim · buttons mirror WhatsApp
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m) => {
              const mine = m.role === "user";
              return (
                <div key={m.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        borderRadius: 16,
                        borderTopRightRadius: mine ? 4 : 16,
                        borderTopLeftRadius: mine ? 16 : 4,
                        padding: "8px 12px",
                        background: mine ? "#005c4b" : "#202c33",
                        color: "#e9edef",
                        fontSize: 15,
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.content}
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          textAlign: "right",
                          color: mine ? "#aebac1" : "#8696a0",
                        }}
                      >
                        {new Date(m.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {!mine && m.buttons && m.buttons.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        marginLeft: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxWidth: "85%",
                      }}
                    >
                      {m.buttons.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (b.id === "pay" && m.payUrl) {
                              window.open(m.payUrl, "_blank");
                              return;
                            }
                            void send(b.id, b.title);
                          }}
                          style={{
                            borderRadius: 10,
                            border: "1px solid rgba(0,168,132,0.5)",
                            background: "#1a2a30",
                            color: "#00a884",
                            fontSize: 14,
                            fontWeight: 600,
                            padding: "10px 14px",
                            cursor: busy ? "default" : "pointer",
                            textAlign: "center",
                          }}
                        >
                          {b.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {!mine && m.stays && m.stays.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        marginLeft: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxWidth: "90%",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          color: "#8696a0",
                          margin: "4px 0 0",
                        }}
                      >
                        Choose stay
                      </p>
                      {m.stays.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void send(s.id)}
                          style={{
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "#1a2a30",
                            color: "#e9edef",
                            fontSize: 13,
                            padding: 0,
                            cursor: busy ? "default" : "pointer",
                            textAlign: "left",
                            overflow: "hidden",
                          }}
                        >
                          {s.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.photoUrl}
                              alt=""
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : null}
                          <span style={{ display: "block", padding: "10px 12px" }}>
                            <strong style={{ color: "#00a884" }}>{s.title}</strong>
                            <span
                              style={{
                                display: "block",
                                color: "#8696a0",
                                marginTop: 2,
                              }}
                            >
                              {s.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {busy && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "#202c33",
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    padding: "12px 16px",
                    color: "#8696a0",
                    fontSize: 13,
                  }}
                >
                  …
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            background: "#1f2c34",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "10px 12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              marginBottom: 10,
              paddingBottom: 2,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => void send(s)}
                style={{
                  flexShrink: 0,
                  borderRadius: 999,
                  border: "1px solid rgba(0,168,132,0.45)",
                  background: "transparent",
                  color: "#00a884",
                  fontSize: 12,
                  padding: "6px 12px",
                  cursor: busy ? "default" : "pointer",
                  opacity: busy ? 0.4 : 1,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={busy}
              placeholder="Message"
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 24,
                border: "none",
                outline: "none",
                background: "#2a3942",
                color: "#e9edef",
                padding: "10px 16px",
                fontSize: 15,
              }}
            />
            <button
              type="button"
              aria-label="Send"
              disabled={busy || !text.trim()}
              onClick={() => void send()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                border: "none",
                background: "#00a884",
                color: "#0b141a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: busy || !text.trim() ? "default" : "pointer",
                opacity: busy || !text.trim() ? 0.4 : 1,
              }}
            >
              <SendHorizonal size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
