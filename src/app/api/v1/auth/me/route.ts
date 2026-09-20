import { NextResponse } from "next/server";
import { getSessionHost, workspaceHostId } from "@/lib/agency-auth";

export const runtime = "nodejs";

export async function GET() {
  const host = await getSessionHost();
  if (!host) {
    return NextResponse.json({ error: "Please log in" }, { status: 401 });
  }
  return NextResponse.json({
    host: {
      id: host.id,
      email: host.email,
      name: host.name,
      businessName: host.businessName,
      phone: host.phone,
      whatsapp: host.whatsapp,
      verified: host.verified,
      role: host.role,
      agencyOwnerId: host.agencyOwnerId,
      workspaceHostId: workspaceHostId(host),
      commissionBps: host.commissionBps,
      apiKeyPrefix: host.apiKeyPrefix,
    },
  });
}
