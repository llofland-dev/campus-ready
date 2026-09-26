import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "eop_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — matches "download once, use offline"
// The Facility Admin tier can run incidents and edit contacts, so it lapses far sooner than the base
// tier. When it lapses the person simply falls back to normal staff access (no need to sign in again)
// and can unlock admin access again with the passphrase.
const ADMIN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export type AccessTier = "user" | "admin";

type SessionPayload = {
  orgId: string;
  tier: AccessTier;
  exp: number; // unix seconds
  // Bumps whenever the org's staff password or Facility Admin passphrase changes; a cookie from before the
  // change no longer matches the org's current epoch and is rejected (see getActiveSession in eop-org.ts).
  epoch?: number;
  // Admin tier is honoured only until this time (unix seconds). A cookie without it is treated as staff.
  adminUntil?: number;
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
export function createSessionCookie(orgId: string, tier: AccessTier, epoch = 0) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    orgId,
    tier,
    exp: now + MAX_AGE_SECONDS,
    epoch,
    ...(tier === "admin" ? { adminUntil: now + ADMIN_TTL_SECONDS } : {}),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${payloadB64}.${sign(payloadB64)}`;

  return { name: COOKIE_NAME, value: token, maxAge: MAX_AGE_SECONDS };
}

export function verifySessionCookie(token: string | undefined): { orgId: string; tier: AccessTier; epoch: number } | null {
  if (!token) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    // Admin tier counts only while its own (short) window is open. Cookies signed before that window existed
    // carry no `adminUntil`, so they fall back to base staff access rather than keeping admin for 30 days.
    const isAdmin = payload.tier === "admin" && typeof payload.adminUntil === "number" && payload.adminUntil > now;
    return { orgId: payload.orgId, tier: isAdmin ? "admin" : "user", epoch: typeof payload.epoch === "number" ? payload.epoch : 0 };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
