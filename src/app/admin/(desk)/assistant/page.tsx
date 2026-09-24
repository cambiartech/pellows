"use client";

import { useCallback, useEffect, useState } from "react";

type SettingsPayload = {
  settings: {
    useLlm: boolean;
    geminiModel: string | null;
  };
  effective: {
    llmEnabled: boolean;
    llmProvider: string | null;
    llmModel: string | null;
    hasGeminiEnv: boolean;
    useLlmEnvFlag: string;
  };
};

export default function AdminAssistantPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [modelDraft, setModelDraft] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/settings");
    if (!res.ok) return;
    const data = (await res.json()) as SettingsPayload;
    setSettings(data);
    setModelDraft(data.settings.geminiModel || "");
  }, []);

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
      setMsg(
        data.effective?.llmEnabled
          ? "LLM on — WhatsApp will use Gemini when keyed."
          : "LLM off — agent uses the rules engine.",
      );
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const useLlm = settings?.settings.useLlm ?? false;
  const llmOn = settings?.effective.llmEnabled ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[2.25rem] font-medium tracking-[-0.03em]">
        Assistant
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        Flip the guest model here instead of redeploying env vars.
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
          Guest LLM
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          When on, WhatsApp uses Gemini (needs{" "}
          <code className="text-[var(--ink)]">GEMINI_API_KEY</code>). Overrides
          Netlify <code className="text-[var(--ink)]">PELLOWS_USE_LLM=0</code>.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              Use LLM{" "}
              <span className={llmOn ? "text-[var(--sea)]" : "text-[var(--muted)]"}>
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
            disabled={busy || !settings}
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
                void patchSettings({ geminiModel: modelDraft.trim() || null })
              }
              className="btn-pill btn-primary disabled:opacity-50"
            >
              Save model
            </button>
          </div>
          {settings?.effective.llmModel && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Effective: {settings.effective.llmProvider}/{settings.effective.llmModel}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
