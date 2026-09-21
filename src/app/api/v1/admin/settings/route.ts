import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";
import {
  isGuestLlmEnabled,
  resolveGuestLlmAsync,
} from "@/lib/agent/llm-provider";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAppSettings();
  const llm = await resolveGuestLlmAsync();
  const llmEnabled = await isGuestLlmEnabled();

  return NextResponse.json({
    ok: true,
    settings: {
      useLlm: settings.useLlm,
      geminiModel: settings.geminiModel,
      updatedAt: settings.updatedAt,
    },
    effective: {
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
      useLlmEnvFlag: process.env.PELLOWS_USE_LLM ?? "(unset)",
    },
  });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { useLlm?: boolean; geminiModel?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: { useLlm?: boolean; geminiModel?: string | null } = {};
  if (typeof body.useLlm === "boolean") patch.useLlm = body.useLlm;
  if (body.geminiModel !== undefined) {
    const m = body.geminiModel;
    patch.geminiModel =
      m === null || m === "" ? null : String(m).trim().slice(0, 80);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const settings = await updateAppSettings(patch);
  const llmEnabled = await isGuestLlmEnabled();
  const llm = await resolveGuestLlmAsync();

  return NextResponse.json({
    ok: true,
    settings: {
      useLlm: settings.useLlm,
      geminiModel: settings.geminiModel,
      updatedAt: settings.updatedAt,
    },
    effective: {
      llmEnabled,
      llmProvider: llm?.provider ?? null,
      llmModel: llm?.modelId ?? null,
    },
  });
}
