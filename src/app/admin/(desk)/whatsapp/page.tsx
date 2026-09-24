"use client";

import { useCallback, useEffect, useState } from "react";

type WaEvent = {
  at: string;
  method: string;
  summary: string;
  text?: string;
  llm?: string;
};

export default function AdminWhatsAppPage() {
  const [events, setEvents] = useState<WaEvent[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/wa-debug");
    if (!res.ok) return;
    const data = await res.json();
    setEvents((data.events || []).slice(0, 40));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.25rem] font-medium tracking-[-0.03em]">
            WhatsApp
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Inbound webhook hits. The guest inbox that is live today.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-pill border border-[var(--hairline)] bg-white text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No webhook events yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="border-b border-[var(--hairline)] pb-2 last:border-0"
              >
                <span className="text-[var(--muted)]">
                  {e.at.slice(0, 19)} · {e.method}
                </span>
                <br />
                {e.summary}
                {e.llm ? ` · llm=${e.llm}` : ""}
                {e.text ? ` · “${e.text}”` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
