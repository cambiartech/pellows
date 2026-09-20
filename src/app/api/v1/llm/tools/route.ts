import { NextResponse } from "next/server";
import { toolCatalog } from "@/lib/agent/tools";

export const runtime = "nodejs";

/** OpenAPI-ish tool catalog for ChatGPT Actions / Gemini / custom agents. */
export async function GET() {
  return NextResponse.json({
    name: "pellows",
    version: "0.1.0",
    description:
      "Pellows booking tools — search live inventory, hold dates, start payment (card/bank/crypto).",
    tools: toolCatalog,
    invoke: "POST /api/v1/llm/invoke",
  });
}
