import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Partner stubs — return 501 until credentials land (B1.25a/b/c). */

export async function GET() {
  return NextResponse.json(
    {
      status: "pending_credentials",
      partners: {
        bookingConnectivity: {
          id: "B1.25a",
          docs: "https://developers.booking.com/",
          env: ["BOOKING_CONNECTIVITY_CLIENT_ID", "BOOKING_CONNECTIVITY_CLIENT_SECRET"],
        },
        bookingDemand: {
          id: "B1.25b",
          docs: "https://developers.booking.com/",
          flow: "POST /search → /availability → /orders/preview → /orders/create",
          env: ["BOOKING_DEMAND_CLIENT_ID", "BOOKING_DEMAND_CLIENT_SECRET"],
        },
        airbnbHomes: {
          id: "B1.25c",
          docs: "https://developer.withairbnb.com/",
          env: ["AIRBNB_CLIENT_ID", "AIRBNB_CLIENT_SECRET"],
        },
      },
      attainableNow: ["/host/import", "/api/v1/imports/ical", "/api/v1/imports/listing-url", "/api/v1/imports/csv"],
    },
    { status: 501 },
  );
}
