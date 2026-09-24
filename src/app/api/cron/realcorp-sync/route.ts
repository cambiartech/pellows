import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncRealcorpLink } from "@/lib/sources/realcorp";

export const runtime = "nodejs";

const AT_ONCE = 4;

/**
 * Catch-up for opted-in Realcorp tenants. A missed webhook still lands here.
 * Protect with CRON_SECRET. This does not run inside a guest message.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const ok =
    secret &&
    (auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret);

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.sourceLink.findMany({
    where: {
      provider: "realcorp",
      accessToken: { not: null },
      externalTenantId: { not: null },
    },
  });

  const results: { hostId: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < links.length; i += AT_ONCE) {
    const chunk = links.slice(i, i + AT_ONCE);
    const settled = await Promise.all(
      chunk.map(async (link) => {
        const result = await syncRealcorpLink(link);
        return {
          hostId: link.hostId,
          ok: result.ok,
          error: result.ok ? undefined : result.error,
        };
      }),
    );
    results.push(...settled);
  }

  return NextResponse.json({
    ok: true,
    tenants: results.length,
    failed: results.filter((row) => !row.ok).length,
    results,
  });
}
