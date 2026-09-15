import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "eop_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — matches "download once, use offline"

export type AccessTier = "user" | "admin";

type SessionPayload = {
  orgId: string;
  tier: AccessTier;
  exp: number; // unix seconds
};

function secret() {
  const value = process.env.EOP_SESSION_SECRET;
  if (!value) throw new Error("EOP_SESSION_SECRET is not set");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Signed, httpOnly cookie proving the bearer already passed the org-code +
// password gate for `orgId`. This is the only thing standing between the
// public /plan routes and an org's content, so it's HMAC-signed (not just
// base64) to stop forgery, and verified against the current time on every
// read (see lib/supabase/admin.ts for how it's used).
export function createSessionCookie(orgId: string, tier: AccessTier) {
  const payload: SessionPayload = { orgId, tier, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${payloadB64}.${sign(payloadB64)}`;

  return { name: COOKIE_NAME, value: token, maxAge: MAX_AGE_SECONDS };
}

export function verifySessionCookie(token: string | undefined): { orgId: string; tier: AccessTier } | null {
  if (!token) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    // Cookies signed before this tier system shipped have no `tier` field —
    // treat them as the base tier rather than crashing, so existing sessions
    // don't get logged out by this change.
    return { orgId: payload.orgId, tier: payload.tier === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
