import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionHost,
  hashPassword,
  isOwner,
  workspaceHostId,
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/agency-auth";

export const runtime = "nodejs";

export async function GET() {
  const host = await getSessionHost();
  if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const ownerId = workspaceHostId(host);
  const [staff, invites] = await Promise.all([
    prisma.host.findMany({
      where: { OR: [{ id: ownerId }, { agencyOwnerId: ownerId }] },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyOwnerId: true,
        createdAt: true,
      },
    }),
    prisma.agencyInvite.findMany({
      where: { hostId: ownerId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ staff, invites });
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).optional(),
  role: z.enum(["OPS"]).default("OPS"),
});

export async function POST(request: Request) {
  try {
    const host = await getSessionHost();
    if (!host) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isOwner(host)) {
      return NextResponse.json({ error: "Only owners can invite staff" }, { status: 403 });
    }

    const body = inviteSchema.parse(await request.json());
    const email = body.email.toLowerCase().trim();
    const existing = await prisma.host.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "That email already has a Pellows account" },
        { status: 400 },
      );
    }

    const token = randomBytes(24).toString("hex");
    const invite = await prisma.agencyInvite.create({
      data: {
        hostId: host.id,
        email,
        name: body.name?.trim() || null,
        role: body.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const acceptPath = `/invite/${token}`;
    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        acceptUrl: acceptPath,
      },
      note: "Share acceptUrl with your teammate (email send later).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2),
  password: z.string().min(6),
});

/** Accept invite — creates OPS host under agency. */
export async function PUT(request: Request) {
  try {
    const body = acceptSchema.parse(await request.json());
    const invite = await prisma.agencyInvite.findUnique({
      where: { token: body.token },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });
    }

    const host = await prisma.host.create({
      data: {
        email: invite.email,
        name: body.name.trim(),
        passwordHash: hashPassword(body.password),
        role: invite.role,
        agencyOwnerId: invite.hostId,
        businessName: null,
      },
    });

    await prisma.agencyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const session = await createSession(host.id);
    const res = NextResponse.json({
      host: {
        id: host.id,
        email: host.email,
        name: host.name,
        role: host.role,
      },
    });
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Accept failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
