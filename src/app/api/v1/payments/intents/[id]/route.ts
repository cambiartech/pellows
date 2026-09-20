import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          listing: { select: { title: true, city: true } },
        },
      },
    },
  });
  if (!paymentIntent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ paymentIntent });
}
