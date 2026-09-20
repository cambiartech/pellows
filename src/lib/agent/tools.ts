import { z } from "zod";
import { searchListings } from "@/lib/search";
import { createHold } from "@/lib/bookings";
import { createPaymentIntent, markPaymentSucceeded } from "@/lib/payments";
import type { BookingChannel, PaymentMethod } from "@/generated/prisma";

/** Shared tool catalog for WhatsApp, web agent, ChatGPT, Gemini. */
export const toolCatalog = [
  {
    name: "search_stays",
    description:
      "Search live Pellows inventory. Never invent listings — only report tool results.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
        country: { type: "string" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
        guests: { type: "integer", minimum: 1 },
        kind: {
          type: "string",
          enum: ["STAY", "RENTAL", "EXPERIENCE"],
        },
        q: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "create_hold",
    description: "Hold dates on a listing and create a booking pending payment.",
    parameters: {
      type: "object",
      properties: {
        listingId: { type: "string" },
        checkIn: { type: "string" },
        checkOut: { type: "string" },
        guests: { type: "integer" },
        guestName: { type: "string" },
        guestPhone: { type: "string" },
        guestEmail: { type: "string" },
      },
      required: ["listingId", "checkIn", "checkOut", "guests", "guestName"],
    },
  },
  {
    name: "start_payment",
    description:
      "Start a Pellows payment (CARD, BANK_RAIL, or CRYPTO) for a booking hold.",
    parameters: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        method: { type: "string", enum: ["CARD", "BANK_RAIL", "CRYPTO"] },
      },
      required: ["bookingId", "method"],
    },
  },
] as const;

const searchSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.number().int().min(1).max(30).optional(),
  kind: z.enum(["STAY", "RENTAL", "EXPERIENCE"]).optional(),
  q: z.string().optional(),
});

const holdSchema = z.object({
  listingId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
});

const paySchema = z.object({
  bookingId: z.string(),
  method: z.enum(["CARD", "BANK_RAIL", "CRYPTO"]),
});

export async function invokeTool(
  name: string,
  args: unknown,
  channel: BookingChannel = "API",
) {
  switch (name) {
    case "search_stays": {
      const input = searchSchema.parse(args);
      return searchListings(input);
    }
    case "create_hold": {
      const input = holdSchema.parse(args);
      const booking = await createHold({ ...input, channel });
      return {
        bookingId: booking.id,
        status: booking.status,
        total: booking.total,
        currency: booking.currency,
        holdExpiresAt: booking.holdExpiresAt,
      };
    }
    case "start_payment": {
      const input = paySchema.parse(args);
      const intent = await createPaymentIntent({
        bookingId: input.bookingId,
        method: input.method as PaymentMethod,
      });
      const base = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");
      return {
        paymentIntentId: intent.id,
        status: intent.status,
        method: intent.method,
        amount: intent.amount,
        currency: intent.currency,
        payUrl: `${base}/pay/${intent.id}`,
        instructions: intent.instructions,
      };
    }
    case "confirm_payment_dev": {
      // Dev-only helper until rails webhooks are live
      const id = z.object({ paymentIntentId: z.string() }).parse(args)
        .paymentIntentId;
      return markPaymentSucceeded(id);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
