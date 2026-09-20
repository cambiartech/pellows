import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  sessionCookieOptions,
} from "@/lib/agency-auth";

export const runtime = "nodejs";

const schema = z.object({
  businessName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  whatsapp: z.string().min(7).optional(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.host.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 },
      );
    }

    const host = await prisma.host.create({
      data: {
        email,
        name: body.name.trim(),
        businessName: body.businessName.trim(),
        phone: body.phone?.trim(),
        whatsapp: body.whatsapp?.trim() || body.phone?.trim(),
        passwordHash: hashPassword(body.password),
      },
    });

    const { token, expiresAt } = await createSession(host.id);
    const res = NextResponse.json({
      host: {
        id: host.id,
        email: host.email,
        name: host.name,
        businessName: host.businessName,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
