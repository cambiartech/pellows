/**
 * LLM provider picker for the guest agent.
 *
 * Pellows default for WhatsApp: Gemini Flash
 *  - lowest latency + cost for high-volume chat agents
 *  - solid tool/function calling for search → hold → pay
 *
 * Stack roles:
 *  - Gemini/OpenAI/Claude: speak + call tools (chat copy)
 *  - Jev (TypeSafe): typed intent/slots only (no strings) — when keyed
 *  - Rules: offline fallback
 *
 * Admin `/admin` → AppSettings.useLlm overrides PELLOWS_USE_LLM env.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { getAppSettings } from "@/lib/app-settings";

export type LlmPick = {
  model: LanguageModel;
  provider: "gemini" | "openai" | "meta";
  modelId: string;
};

function keyOk(v: string | undefined) {
  return (v || "").trim().length >= 20;
}

function geminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  );
}

export function resolveGuestLlm(modelOverride?: string | null): LlmPick | null {
  const forced = (process.env.PELLOWS_LLM_PROVIDER || "").toLowerCase();

  const openaiKey = process.env.OPENAI_API_KEY || "";
  const metaKey = process.env.MODEL_API_KEY || "";

  const tryGemini = (): LlmPick | null => {
    if (!keyOk(geminiKey())) return null;
    const google = createGoogleGenerativeAI({ apiKey: geminiKey().trim() });
    const modelId =
      modelOverride?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      ["gemini", "3.6", "flash"].join("-");
    return { model: google(modelId), provider: "gemini", modelId };
  };

  const tryOpenAI = (): LlmPick | null => {
    if (!keyOk(openaiKey)) return null;
    const openai = createOpenAI({ apiKey: openaiKey.trim() });
    const modelId = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return { model: openai(modelId), provider: "openai", modelId };
  };

  const tryMeta = (): LlmPick | null => {
    if (!keyOk(metaKey)) return null;
    const openai = createOpenAI({
      apiKey: metaKey.trim(),
      baseURL: "https://api.meta.ai/v1",
    });
    const modelId = process.env.MODEL_API_MODEL || "muse-spark-1.3";
    return { model: openai(modelId), provider: "meta", modelId };
  };

  if (forced === "gemini") return tryGemini();
  if (forced === "openai") return tryOpenAI();
  if (forced === "meta") return tryMeta();

  return tryGemini() || tryOpenAI() || tryMeta();
}

/** Env-only check (no DB). Prefer `isGuestLlmEnabled()` in request paths. */
export function hasGuestLlm(): boolean {
  return resolveGuestLlm() != null && process.env.PELLOWS_USE_LLM !== "0";
}

/**
 * Effective LLM gate: needs a real key + AppSettings.useLlm.
 * Admin toggle wins over Netlify `PELLOWS_USE_LLM=0`.
 */
export async function isGuestLlmEnabled(): Promise<boolean> {
  let modelOverride: string | null = null;
  let useLlm = process.env.PELLOWS_USE_LLM !== "0";
  try {
    const s = await getAppSettings();
    useLlm = s.useLlm;
    modelOverride = s.geminiModel;
  } catch {
    // DB unavailable — fall back to env
  }
  return resolveGuestLlm(modelOverride) != null && useLlm;
}

/** Resolve model including admin geminiModel override. */
export async function resolveGuestLlmAsync(): Promise<LlmPick | null> {
  try {
    const s = await getAppSettings();
    return resolveGuestLlm(s.geminiModel);
  } catch {
    return resolveGuestLlm();
  }
}
