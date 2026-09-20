import { NextResponse } from "next/server";
import { listWaDebug } from "@/lib/wa-debug";

export const runtime = "nodejs";

/** Recent WhatsApp webhook hits — proves whether Meta is calling us. */
export async function GET() {
  return NextResponse.json({
    events: listWaDebug(),
    tip: "Text +1 (555) 178-5378, wait 5s, refresh this URL. If events stay empty, Meta webhook is not subscribed/pointing here.",
  });
}
