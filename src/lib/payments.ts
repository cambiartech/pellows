import { prisma } from "@/lib/db";
import { confirmBooking } from "@/lib/bookings";
import type { PaymentMethod } from "@/generated/prisma";
import { randomBytes } from "crypto";

export type CreatePaymentInput = {
  bookingId: string;
  method: PaymentMethod;
};

function bankInstructions(amount: number, currency: string, reference: string) {
  return {
    type: "BANK_RAIL" as const,
    bankName: process.env.BANK_RAIL_BANK_NAME ?? "Pellows Settlement",
    accountName: process.env.BANK_RAIL_ACCOUNT_NAME ?? "Pellows Limited",
    accountNumber: process.env.BANK_RAIL_ACCOUNT_NUMBER || "PENDING_SETUP",
    amount,
    currency,
    reference,
    memo: `Pay exactly ${amount} ${currency}. Use reference ${reference}.`,
  };
}

function cryptoInstructions(amount: number, currency: string, reference: string) {
  return {
    type: "CRYPTO" as const,
    asset: process.env.CRYPTO_DEFAULT_ASSET ?? "USDT",
    network: "TRC20",
    address: process.env.CRYPTO_DEPOSIT_ADDRESS || "PENDING_SETUP",
    amount,
    currency,
    reference,
    memo: `Send USDT. Include reference ${reference} in memo if supported.`,
  };
}

function cardInstructions(amount: number, currency: string, reference: string) {
  const provider =
    process.env.CARD_RAIL_PROVIDER ||
    (process.env.STRIPE_SECRET_KEY ? "stripe" : "paystack");
  return {
    type: "CARD" as const,
    provider,
    checkoutPath: `/pay/${reference}`,
    amount,
    currency,
    reference,
    memo:
      provider === "stripe"
        ? "Complete card payment on Pellows checkout (Stripe)."
        : "Complete card payment on Pellows checkout.",
  };
}

/**
 * Pellows-owned payment intent. Card / bank / crypto are methods we operate.
 */
export async function createPaymentIntent(input: CreatePaymentInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "CONFIRMED") throw new Error("Already confirmed");
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    throw new Error("Booking closed");
  }

  const reference = `PEL-${randomBytes(4).toString("hex").toUpperCase()}`;
  const instructions =
    input.method === "BANK_RAIL"
      ? bankInstructions(booking.total, booking.currency, reference)
      : input.method === "CRYPTO"
        ? cryptoInstructions(booking.total, booking.currency, reference)
        : cardInstructions(booking.total, booking.currency, reference);

  const intent = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING_PAYMENT" },
    });

    return tx.paymentIntent.create({
      data: {
        bookingId: booking.id,
        method: input.method,
        status: "REQUIRES_ACTION",
        currency: booking.currency,
        amount: booking.total,
        providerRef: reference,
        instructions,
      },
    });
  });

  return intent;
}

/**
 * Mark payment succeeded and confirm booking + write ledger.
 * Wired to processor webhooks / bank match / crypto watcher.
 */
export async function markPaymentSucceeded(paymentIntentId: string) {
  return prisma.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });
    if (!intent) throw new Error("Payment intent not found");
    if (intent.status === "SUCCEEDED") return intent;

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "SUCCEEDED", succeededAt: new Date() },
    });

    const platformFee = Math.round(intent.amount * 0.1);
    const hostPayable = intent.amount - platformFee;

    await tx.paymentLedgerEntry.createMany({
      data: [
        {
          paymentIntentId: intent.id,
          type: "GUEST_CHARGE",
          currency: intent.currency,
          amount: intent.amount,
          account: "platform:clearing",
          memo: `Guest paid via ${intent.method}`,
        },
        {
          paymentIntentId: intent.id,
          type: "PLATFORM_FEE",
          currency: intent.currency,
          amount: platformFee,
          account: "platform:revenue",
          memo: "Pellows fee",
        },
        {
          paymentIntentId: intent.id,
          type: "HOST_PAYABLE",
          currency: intent.currency,
          amount: hostPayable,
          account: "host:payable",
          memo: "Host settlement",
        },
      ],
    });

    return intent;
  }).then(async (intent) => {
    await confirmBooking(intent.bookingId);
    return prisma.paymentIntent.findUniqueOrThrow({
      where: { id: intent.id },
      include: { ledger: true, booking: true },
    });
  });
}
