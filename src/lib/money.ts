/**
 * Money helpers — hosts price in listing currency (usually NGN).
 * Guests abroad see / pay USD with FX markup (Flutterwave).
 */

/** Mid-market-ish NGN per 1 USD. Override with FX_USD_NGN. */
export function fxUsdNgn(): number {
  const n = Number(process.env.FX_USD_NGN || "1600");
  return Number.isFinite(n) && n > 0 ? n : 1600;
}

/** Extra bps on top of mid rate (e.g. 300 = 3%). */
export function fxMarkupBps(): number {
  const n = Number(process.env.FX_MARKUP_BPS || "300");
  return Number.isFinite(n) && n >= 0 ? n : 300;
}

export function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency.toUpperCase() === "USD" ? 2 : 0,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(currency.toUpperCase() === "USD" ? 2 : 0)} ${currency}`;
  }
}

/** Convert NGN minor units → USD minor (cents), applying FX markup. */
export function ngnMinorToUsdMinor(ngnMinor: number): number {
  const ngnMajor = ngnMinor / 100;
  const rate = fxUsdNgn() * (1 + fxMarkupBps() / 10_000);
  const usdMajor = ngnMajor / rate;
  return Math.max(1, Math.ceil(usdMajor * 100));
}

/** Guest-facing dual price: listing currency + USD when listing is NGN. */
export function dualPriceLabel(amountMinor: number, currency: string) {
  const primary = formatMoney(amountMinor, currency);
  if (currency.toUpperCase() !== "NGN") {
    return { primary, usd: null as string | null, usdMinor: null as number | null };
  }
  const usdMinor = ngnMinorToUsdMinor(amountMinor);
  return {
    primary,
    usd: formatMoney(usdMinor, "USD"),
    usdMinor,
  };
}

export function cardRailProvider(): "flutterwave" | "paystack" | "stripe" {
  const explicit = (process.env.CARD_RAIL_PROVIDER || "").toLowerCase();
  if (explicit === "flutterwave" || explicit === "paystack" || explicit === "stripe") {
    return explicit;
  }
  if (process.env.FLW_SECRET_KEY) return "flutterwave";
  if (process.env.PAYSTACK_SECRET_KEY) return "paystack";
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "flutterwave";
}
