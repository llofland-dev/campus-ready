import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/eop-session";
import { loadOrgState, lookupOrgByCode, normalizeOrgCode } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, readJsonObject } from "@/lib/api-utils";
import { clientKey, isBlocked, recordHit, tooManyRequests } from "@/lib/rate-limit";

// Limits on WRONG guesses. Only failures are counted: a school full of staff sharing one Wi-Fi address all
// signing in correctly at a morning drill must never trip these. 10 wrong guesses per person per school and
// 100 wrong-or-unknown attempts per person overall, each per 15 minutes. Together with the minimum password
// lengths this makes guessing a password impractical, without ever locking a whole school out.
const WINDOW_SECONDS = 15 * 60;
const MAX_WRONG_PER_ORG = 10;
const MAX_FAILURES_OVERALL = 100;

// Re-verifies server-side regardless of what the client already checked —
// the client-side lookup (for deciding whether to show a password field) is
// UX only, not a security boundary. This is the only place the org-code +
// password gate is actually enforced.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) {
    return jsonError("Invalid request", 400);
  }

  const code = typeof body.code === "string" ? normalizeOrgCode(body.code) : "";
  const password = typeof body.password === "string" ? body.password : undefined;
  // Set by "Unlock admin access" inside an already-open plan: only the admin
  // passphrase is acceptable there (see the check before the cookie is issued).
  const requireAdmin = body.requireAdmin === true;

  if (!code || code.length > 64 || (password && password.length > 200)) {
    return jsonError("Missing or invalid code", 400);
  }

  const who = clientKey(request);

  // Someone who has already made too many failed attempts is turned away before we do any work for them.
  const overall = await isBlocked("verify:any", who, MAX_FAILURES_OVERALL, WINDOW_SECONDS);
  if (overall.blocked) return tooManyRequests(overall.retryAfterSeconds, "Too many incorrect attempts.");

  const org = await lookupOrgByCode(code);

  if (!org) {
    // Unknown codes count too, so the sign-in screen can't be used to hunt for valid plan codes.
    await recordHit("verify:any", who, MAX_FAILURES_OVERALL, WINDOW_SECONDS);
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  // Explicit `=== false` (not just falsy) so this defaults open — a
  // database that hasn't run the `active` migration yet returns undefined,
  // which must not read as "suspended" and lock every organization out.
  if (org.active === false) {
    return NextResponse.json(
      { error: "This organization's access has been suspended. Contact Emergency Preparedness Solutions." },
      { status: 403 }
    );
  }

  const perOrgBucket = `verify:org:${org.id}`;
  const perOrg = await isBlocked(perOrgBucket, who, MAX_WRONG_PER_ORG, WINDOW_SECONDS);
  if (perOrg.blocked) return tooManyRequests(perOrg.retryAfterSeconds, "Too many incorrect attempts.");

  // A wrong password (or wrong admin passphrase) is recorded against this person, for this school and overall.
  // At most once per request, however many branches below notice the same wrong guess.
  let failureRecorded = false;
  const recordFailure = async () => {
    if (failureRecorded) return;
    failureRecorded = true;
    await Promise.all([
      recordHit(perOrgBucket, who, MAX_WRONG_PER_ORG, WINDOW_SECONDS),
      recordHit("verify:any", who, MAX_FAILURES_OVERALL, WINDOW_SECONDS),
    ]);
  };

  // has_password means a password is REQUIRED for base (User-tier) entry.
  // An org can also have a second, independent admin-tier passphrase even
  // when has_password is false — in that case any input that isn't the
  // admin passphrase just falls back to User tier rather than being
  // rejected, since there's nothing "incorrect" about an optional field.
  let tier: "user" | "admin" = "user";

  if (password) {
    // Service-role call: eop_verify_org_password is not callable with the public key, so this route (with the
    // limits above) is the only way to test a password.
    const { data: matchedTier } = await createAdminClient().rpc("eop_verify_org_password", {
      p_org_id: org.id,
      p_password: password,
    });

    if (matchedTier === "admin" || matchedTier === "user") {
      tier = matchedTier;
    } else {
      // Something was typed and it matched nothing: that is a wrong guess EVEN IF the school has no staff
      // password (where the field is optional and a wrong entry just falls back to normal access) — otherwise
      // the admin passphrase could be guessed for free on those plans.
      await recordFailure();
      if (org.has_password) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }
    }
  } else if (org.has_password) {
    // Nothing was typed: not a guess, so it isn't counted.
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Anything short of the admin passphrase must fail loudly and leave the
  // caller's current session untouched, rather than quietly issuing a fresh
  // User-level cookie (which is what the optional-password path above does).
  if (requireAdmin && tier !== "admin") {
    if (password) await recordFailure(); // e.g. the staff password typed where the admin passphrase belongs
    return NextResponse.json({ error: "Incorrect admin passphrase" }, { status: 401 });
  }

  // The cookie is stamped with the school's current session_epoch, so changing a password later signs
  // everyone who entered with the old one back out.
  const state = await loadOrgState(org.id);
  const cookie = createSessionCookie(org.id, tier, state?.session_epoch ?? 0);
  const response = NextResponse.json({ ok: true, name: org.name });
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });

  return response;
}
