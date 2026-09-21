"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";

type SettingsPayload = {
  settings: {
    useLlm: boolean;
    geminiModel: string | null;
    updatedAt: string;
  };
  effective: {
    llmEnabled: boolean;
    llmProvider: string | null;
    llmModel: string | null;
    hasGeminiEnv: boolean;
    useLlmEnvFlag: string;
  };
};

type StatusPayload = {
  ok: boolean;
  liveListings: number;
  whatsappOutboundReady: boolean;
  hint: string;
  appUrl: string | null;
};

type HealthPayload = {
  llmEnabled: boolean;
  llmProvider: string | null;
  llmModel: string | null;
  useLlmFlag: string;
  useLlmSettings: boolean | null;
};

type WaEvent = {
  at: string;
  method: string;
  summary: string;
  from?: string;
  text?: string;
  llm?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [waEvents, setWaEvents] = useState<WaEvent[]>([]);
  const [modelDraft, setModelDraft] = useState("");

  const load = useCallback(async () => {
    const session = await fetch("/api/v1/admin/session");
    if (!session.ok) {
      router.replace("/admin/login");
      return;
    }

    const [sRes, stRes, hRes, wRes] = await Promise.all([
      fetch("/api/v1/admin/settings"),
      fetch("/api/v1/admin/status"),
      fetch("/api/v1/admin/agent-health"),
      fetch("/api/v1/admin/wa-debug"),
    ]);

    if (sRes.ok) {
      const data = (await sRes.json()) as SettingsPayload;
      setSettings(data);
      setModelDraft(data.settings.geminiModel || "");
    }
    if (stRes.ok) setStatus((await stRes.json()) as StatusPayload);
    if (hRes.ok) setHealth((await hRes.json()) as HealthPayload);
    if (wRes.ok) {
      const w = await wRes.json();
      setWaEvents((w.events || []).slice(0, 12));
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchSettings(patch: {
    useLlm?: boolean;
    geminiModel?: string | null;
  }) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data as SettingsPayload);
      setMsg(
        data.effective?.llmEnabled
          ? "LLM on — WhatsApp will use Gemini when keyed."
          : "LLM off — agent uses rules engine.",
      );
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

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

  async function logout() {
    await fetch("/api/v1/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  const useLlm = settings?.settings.useLlm ?? false;
  const llmOn = settings?.effective.llmEnabled ?? false;

  return (
    <div className="min-h-dvh px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
              Platform
            </p>
            <h1 className="font-display mt-1 text-[2.25rem] font-medium tracking-[-0.03em]">
              Settings
            </h1>
            <p className="mt-1 text-[var(--muted)]">
              Flip switches here instead of redeploying env vars.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="text-sm font-semibold text-[var(--sea)] underline-offset-4 hover:underline"
            >
              Chat sim
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm font-semibold text-[var(--muted)] underline-offset-4 hover:underline"
            >
              Log out
            </button>
          </div>
        </div>

        {msg && (
          <p
            className="mt-6 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-sm"
            role="status"
          >
            {msg}
          </p>
        )}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              Guest LLM
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              When on, WhatsApp + chat use Gemini (needs{" "}
              <code className="text-[var(--ink)]">GEMINI_API_KEY</code>).
              Overrides Netlify{" "}
              <code className="text-[var(--ink)]">PELLOWS_USE_LLM=0</code>.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  Use LLM{" "}
                  <span
                    className={
                      llmOn ? "text-[var(--sea)]" : "text-[var(--muted)]"
                    }
                  >
                    {llmOn ? "· live" : "· rules only"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Env flag: {settings?.effective.useLlmEnvFlag ?? "—"} · key:{" "}
                  {settings?.effective.hasGeminiEnv ? "present" : "missing"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void patchSettings({ useLlm: !useLlm })}
                className={`relative h-9 w-[3.75rem] rounded-full transition-colors disabled:opacity-50 ${
                  useLlm ? "bg-[var(--sea)]" : "bg-[var(--hairline-strong)]"
                }`}
                aria-pressed={useLlm}
                aria-label="Toggle LLM"
              >
                <span
                  className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${
                    useLlm ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold" htmlFor="gemini-model">
                Gemini model override
              </label>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Leave blank to use env / default flash id.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="gemini-model"
                  value={modelDraft}
                  onChange={(e) => setModelDraft(e.target.value)}
                  placeholder="e.g. gemini-3.6-flash"
                  className="min-w-0 flex-1 rounded-[var(--radius-ui)] border border-[var(--hairline)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sea)]"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void patchSettings({
                      geminiModel: modelDraft.trim() || null,
                    })
                  }
                  className="btn-pill btn-primary disabled:opacity-50"
                >
                  Save model
                </button>
              </div>
              {settings?.effective.llmModel && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Effective: {settings.effective.llmProvider}/
                  {settings.effective.llmModel}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              Health
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">LLM enabled</dt>
                <dd className="font-semibold">
                  {health?.llmEnabled ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Provider / model</dt>
                <dd className="font-semibold">
                  {health?.llmProvider || "—"} / {health?.llmModel || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">LIVE listings</dt>
                <dd className="font-semibold">
                  {status?.liveListings ?? "—"}
                </dd>
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
          </div>

          <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              Recent WhatsApp
            </h2>
            {waEvents.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No webhook events yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {waEvents.map((e, i) => (
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
          </div>
        </motion.section>
      </div>
    </div>
  );
}
