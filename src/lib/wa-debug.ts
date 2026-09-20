/**
 * In-memory last WhatsApp webhook events (per instance).
 * Use GET /api/v1/admin/wa-debug to see if Meta is delivering.
 */
export type WaDebugEvent = {
  at: string;
  method: "GET" | "POST";
  summary: string;
  from?: string;
  text?: string;
  replied?: boolean;
  error?: string;
};

const MAX = 20;
const events: WaDebugEvent[] = [];

export function recordWaDebug(ev: WaDebugEvent) {
  events.unshift(ev);
  if (events.length > MAX) events.pop();
}

export function listWaDebug() {
  return events;
}
