import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "pellows_agency";
const SESSION_DAYS = 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}



export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export function newSessionToken() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

export async function createSession(hostId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.agencySession.create({
    data: { token, hostId, expiresAt },
  });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.agencySession.deleteMany({ where: { token } });
}

export async function getSessionHost() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.agencySession.findUnique({
    where: { token },
    include: { host: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.agencySession.delete({ where: { id: session.id } });
    return null;
  }
  return session.host;
}

/** Listings / payouts belong to the agency owner workspace (staff share it). */
export function workspaceHostId(host: { id: string; agencyOwnerId: string | null }) {
  return host.agencyOwnerId || host.id;
}

export function isOwner(host: { role: string; agencyOwnerId: string | null }) {
  return host.role === "OWNER" && !host.agencyOwnerId;
}

export function generateApiKey() {
  const raw = `pel_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, prefix: raw.slice(0, 10) };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function getHostFromApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("pel_")) return null;
  const hash = hashApiKey(raw);
  return prisma.host.findFirst({ where: { apiKeyHash: hash } });
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
