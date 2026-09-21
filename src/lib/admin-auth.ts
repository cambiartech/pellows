import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "pellows_admin";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Password for /admin — set ADMIN_PASSWORD on Netlify; default for launch testing. */
export function adminPassword() {
  return (process.env.ADMIN_PASSWORD || "Pass@123").trim();
}

function signingSecret() {
  return (
    process.env.ADMIN_SECRET ||
    process.env.LLM_CHANNEL_SECRET ||
    adminPassword()
  );
}

export function verifyAdminPassword(password: string) {
  const expected = adminPassword();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function mintAdminToken() {
  const exp = Date.now() + WEEK_MS;
  const payload = `admin:${exp}`;
  const sig = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminToken(token: string | undefined | null) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!expStr || !sig || !Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `admin:${exp}`;
  const expected = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) return false;
  return true;
}

export async function setAdminCookie(token: string) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
