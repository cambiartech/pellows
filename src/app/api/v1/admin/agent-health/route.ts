import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";
import {
  isGuestLlmEnabled,
  resolveGuestLlmAsync,
} from "@/lib/agent/llm-provider";

export const runtime = "nodejs";

/** Safe ops check — no secrets. Reflects admin AppSettings overrides. */
export async function GET() {
  let useLlmDb: boolean | null = null;
  let geminiModelDb: string | null = null;
  try {
    const s = await getAppSettings();
    useLlmDb = s.useLlm;
    geminiModelDb = s.geminiModel;
  } catch {
    // ignore
  }

  const llm = await resolveGuestLlmAsync();
  const llmEnabled = await isGuestLlmEnabled();

  return NextResponse.json({
    ok: true,
    llmEnabled,
    llmProvider: llm?.provider ?? null,
    llmModel: llm?.modelId ?? null,
    hasGeminiEnv: Boolean(
      (
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        ""
      ).trim().length >= 20,
    ),
    useLlmFlag: process.env.PELLOWS_USE_LLM ?? "(unset)",
    useLlmSettings: useLlmDb,
    geminiModelSettings: geminiModelDb,
  });
}
