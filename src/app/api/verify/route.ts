import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/eop-session";
import { normalizeOrgCode } from "@/lib/eop-org";
import { jsonError, readJsonObject } from "@/lib/api-utils";

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

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: orgs, error: lookupError } = await supabase.rpc("eop_lookup_org", {
    p_code: code,
  });

  if (lookupError || !orgs || orgs.length === 0) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const org = orgs[0] as { id: string; name: string; has_password: boolean; active: boolean };

  // Explicit `=== false` (not just falsy) so this defaults open — a
  // database that hasn't run the `active` migration yet returns undefined,
  // which must not read as "suspended" and lock every organization out.
  if (org.active === false) {
    return NextResponse.json(
      { error: "This organization's access has been suspended. Contact Emergency Preparedness Solutions." },
      { status: 403 }
    );
  }

  // has_password means a password is REQUIRED for base (User-tier) entry.
  // An org can also have a second, independent admin-tier passphrase even
  // when has_password is false — in that case any input that isn't the
  // admin passphrase just falls back to User tier rather than being
  // rejected, since there's nothing "incorrect" about an optional field.
  let tier: "user" | "admin" = "user";

  if (password) {
    const { data: matchedTier } = await supabase.rpc("eop_verify_org_password", {
      p_org_id: org.id,
      p_password: password,
    });

    if (matchedTier === "admin" || matchedTier === "user") {
      tier = matchedTier;
    } else if (org.has_password) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  } else if (org.has_password) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Anything short of the admin passphrase must fail loudly and leave the
  // caller's current session untouched, rather than quietly issuing a fresh
  // User-level cookie (which is what the optional-password path above does).
  if (requireAdmin && tier !== "admin") {
    return NextResponse.json({ error: "Incorrect admin passphrase" }, { status: 401 });
  }

  const cookie = createSessionCookie(org.id, tier);
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
