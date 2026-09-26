import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Abuse limits, backed by the `rate_limits` table (see the 20260927 security-hardening migration). The
// counters are keyed by a keyed HASH of the caller's IP address (never the raw IP), so nothing personal is
// stored, and the table can only be touched by the server.
//
// Why this exists: staff sign in with a plan code and an optional password, so anyone can try passwords
// against any plan code. Without a limit that is unlimited free guessing.
//
// FAIL OPEN, LOUDLY: if the limiter itself is unavailable (for example the migration hasn't been run yet)
// requests are allowed and the error is logged, because locking every school out of its emergency plan is a
// worse failure than a missing throttle. The post-deploy smoke test checks that the throttle really works, so
// a missing migration cannot go unnoticed.

export type LimitResult = { blocked: boolean; retryAfterSeconds: number };
const OPEN: LimitResult = { blocked: false, retryAfterSeconds: 0 };

// Identifies the caller without storing their address. Vercel overwrites these headers at the edge, so a
// caller cannot pick their own value; locally there is no proxy, so everything shares one bucket.
export function clientKey(request: Request): string {
  const h = request.headers;
  const ip =
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const secret = process.env.EOP_SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(ip).digest("base64url").slice(0, 22);
}

async function call(fn: "eop_rate_limit_check" | "eop_rate_limit_hit", bucket: string, key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
  try {
    const { data, error } = await createAdminClient().rpc(fn, { p_bucket: bucket, p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error || !Array.isArray(data) || data.length === 0) {
      console.error(`rate limiter unavailable (${fn}): ${error?.message ?? "no result"} — allowing the request`);
      return OPEN;
    }
    return { blocked: Boolean(data[0].blocked), retryAfterSeconds: Number(data[0].retry_after_seconds ?? 0) };
  } catch (e) {
    console.error(`rate limiter failed (${fn}): ${e instanceof Error ? e.message : String(e)} — allowing the request`);
    return OPEN;
  }
}

/** Read-only: has `key` already used up `limit` events in the last `windowSeconds`? */
export function isBlocked(bucket: string, key: string, limit: number, windowSeconds: number) {
  return call("eop_rate_limit_check", bucket, key, limit, windowSeconds);
}

/** Count one event; `blocked` is true once the count exceeds `limit` within the window. */
export function recordHit(bucket: string, key: string, limit: number, windowSeconds: number) {
  return call("eop_rate_limit_hit", bucket, key, limit, windowSeconds);
}

export function tooManyRequests(retryAfterSeconds: number, message = "Too many requests. Please wait and try again.") {
  const seconds = Math.max(1, retryAfterSeconds);
  const minutes = Math.ceil(seconds / 60);
  return NextResponse.json(
    { error: `${message} Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}
