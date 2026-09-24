"use client";

import { useCallback, useEffect, useState } from "react";

type StatusPayload = {
  ok: boolean;
  liveListings: number;
  whatsappOutboundReady: boolean;
  hint: string;
};

type HealthPayload = {
  llmEnabled: boolean;
  llmProvider: string | null;
  llmModel: string | null;
};

export default function AdminOverviewPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);

  const load = useCallback(async () => {
    const [stRes, hRes] = await Promise.all([
      fetch("/api/v1/admin/status"),
      fetch("/api/v1/admin/agent-health"),
    ]);
    if (stRes.ok) setStatus((await stRes.json()) as StatusPayload);
    if (hRes.ok) setHealth((await hRes.json()) as HealthPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSeed() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/admin/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      setMsg(data.message || "Seeded demo inventory");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[2.25rem] font-medium tracking-[-0.03em]">
        Overview
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Live inventory, the guest assistant, and WhatsApp outbound.
      </p>

      {msg && (
        <p
          className="mt-6 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-sm"
          role="status"
        >
          {msg}
        </p>
      )}

      <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
          Health
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">LLM enabled</dt>
            <dd className="font-semibold">{health?.llmEnabled ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Provider / model</dt>
            <dd className="font-semibold">
              {health?.llmProvider || "—"} / {health?.llmModel || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">LIVE listings</dt>
            <dd className="font-semibold">{status?.liveListings ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">WhatsApp outbound</dt>
            <dd className="font-semibold">
              {status?.whatsappOutboundReady ? "ready" : "not set"}
            </dd>
          </div>
        </dl>
        {status?.hint && (
          <p className="mt-4 text-sm text-[var(--muted)]">{status.hint}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="btn-pill border border-[var(--hairline)] bg-white text-sm font-semibold disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSeed()}
            className="btn-pill border border-[var(--hairline)] bg-white text-sm font-semibold disabled:opacity-50"
          >
            Seed demo inventory
          </button>
          <a
            href="/api/v1/admin/agent-health"
            target="_blank"
            rel="noreferrer"
            className="btn-pill border border-[var(--hairline)] bg-white text-sm font-semibold"
          >
            Raw health JSON
          </a>
        </div>
      </section>
    </div>
  );
}
