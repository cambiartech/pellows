import { NextResponse } from "next/server";
import { z } from "zod";
import { invokeTool } from "@/lib/agent/tools";
import type { BookingChannel } from "@/generated/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  tool: z.string(),
  arguments: z.unknown().default({}),
  channel: z
    .enum(["LLM_CHATGPT", "LLM_GEMINI", "LLM_OTHER", "API", "WHATSAPP", "WEB"])
    .optional(),
});

function authorize(request: Request) {
  const secret = process.env.LLM_CHANNEL_SECRET;
  if (!secret) return true; // open in early dev if unset
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await request.json());
    const channel = (body.channel ?? "LLM_OTHER") as BookingChannel;
    const result = await invokeTool(body.tool, body.arguments, channel);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invoke failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
