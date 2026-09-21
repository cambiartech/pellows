import { appBaseUrl } from "@/lib/stripe";

export function flutterwaveConfigured() {
  return Boolean(process.env.FLW_SECRET_KEY);
}

export function flutterwaveSecretKey() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not set");
  return key;
}

export function flutterwaveWebhookHash() {
  return process.env.FLW_SECRET_HASH || "";
}

export { appBaseUrl };

type InitiateInput = {
  txRef: string;
  amountMajor: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name?: string; phonenumber?: string };
  meta?: Record<string, string>;
  title?: string;
};

export async function flutterwaveInitiatePayment(input: InitiateInput) {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${flutterwaveSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amountMajor,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: input.customer,
      customizations: {
        title: input.title || "Pellows",
        description: "Short stay booking",
      },
      meta: input.meta,
    }),
  });

  const data = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };

  if (!res.ok || data.status !== "success" || !data.data?.link) {
    throw new Error(data.message || "Flutterwave initiate failed");
  }

  return { link: data.data.link };
}

export async function flutterwaveVerifyTransaction(transactionId: string) {
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey()}`,
      },
    },
  );

  const data = (await res.json()) as {
    status?: string;
    message?: string;
    data?: {
      id?: number;
      tx_ref?: string;
      status?: string;
      amount?: number;
      currency?: string;
    };
  };

  if (!res.ok || data.status !== "success" || !data.data) {
    throw new Error(data.message || "Flutterwave verify failed");
  }

  return data.data;
}
