import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/agency-auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const host = await prisma.host.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (!host?.passwordHash || !verifyPassword(body.password, host.passwordHash)) {
      return NextResponse.json(
        { error: "Wrong email or password" },
        { status: 401 },
      );
    }

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
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
