import { NextResponse } from "next/server";
import { resolveGuestLlm, hasGuestLlm } from "@/lib/agent/llm-provider";

export const runtime = "nodejs";

/** Safe ops check — no secrets. */
export async function GET() {
  const llm = resolveGuestLlm();
  return NextResponse.json({
    ok: true,
    llmEnabled: hasGuestLlm(),
    llmProvider: llm?.provider ?? null,
    llmModel: llm?.modelId ?? null,
    hasGeminiEnv: Boolean(
      (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
        .trim().length >= 20,
    ),
    useLlmFlag: process.env.PELLOWS_USE_LLM ?? "(unset)",
  });
}
