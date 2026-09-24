/** Guest-facing nightly rate from a source rate. Amounts are minor units. */
export function guestNightlyPrice(input: {
  sourceMinor: number;
  useSourcePrice: boolean;
  markupBps: number;
}) {
  const source = Math.max(0, Math.round(input.sourceMinor));
  if (input.useSourcePrice) return source;
  const bps = Math.max(0, Math.min(50_000, Math.round(input.markupBps)));
  return Math.max(1, Math.round(source * (1 + bps / 10_000)));
}
