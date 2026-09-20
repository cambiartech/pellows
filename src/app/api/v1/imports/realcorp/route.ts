import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

const schema = z.object({
  tenantId: z.string().optional(),
  apiKey: z.string().optional(),
});

/**
 * Realcorp import — ready when REALCORP_API_BASE + key exist.
 * Until then returns clear pending status (B1.22 stub).
 */
export async function POST(request: Request) {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const body = schema.safeParse(await request.json().catch(() => ({})));
  const base = process.env.REALCORP_API_BASE;

  if (!base) {
    return NextResponse.json(
      {
        error: "Realcorp API not configured yet",
        status: "pending_credentials",
        workspaceHostId: workspaceHostId(host),
        brief: "See docs/IMPORT_APIS.md — ask Realcorp for list units + blocks.",
        received: body.success ? body.data : {},
      },
      { status: 501 },
    );
  }

  return NextResponse.json(
    {
      error: "Realcorp connector not wired — base URL set; implement fetch next",
      status: "pending_implementation",
      base,
    },
    { status: 501 },
  );
}
