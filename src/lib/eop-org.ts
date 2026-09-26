import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie, type AccessTier } from "@/lib/eop-session";
import type { Organization } from "@/lib/supabase/types";

export type OrgLookup = {
  id: string;
  name: string;
  has_password: boolean;
  has_admin_password: boolean;
  active: boolean;
  logoUrl: string | null;
} | null;

// Narrow, generic-free shape so this works with both the anon client below
// and the service-role admin client — their full SupabaseClient<...> generic
// signatures don't unify, but getPublicUrl is a pure string builder that
// doesn't care which client instance calls it.
type StorageOnly = { storage: { from: (bucket: string) => { getPublicUrl: (path: string) => { data: { publicUrl: string } } } } };

function orgLogoUrl(supabase: StorageOnly, logoPath: string | null): string | null {
  if (!logoPath) return null;
  return supabase.storage.from("org-logos").getPublicUrl(logoPath).data.publicUrl;
}

// Plan codes are stored uppercase (signup normalizes them), but a code can
// reach the server in any case — a hand-typed URL, a link or QR code someone
// generated in lowercase. Normalizing here (rather than only on the /code
// entry screen) means every path resolves the same org instead of showing
// "Code not found" for /plan/adventist.
export function normalizeOrgCode(code: string): string {
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    // already-decoded or malformed — use as given
  }
  return decoded.trim().toUpperCase();
}

// Pre-auth lookup — just enough to know whether a code exists and whether to
// show a password field. Runs on the server with the service-role client:
// eop_lookup_org is NOT callable with the public (anon) key, so a stranger
// can't enumerate organizations or pull an org's id straight from Supabase.
// It never returns a password hash.
export async function lookupOrgByCode(code: string): Promise<OrgLookup> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("eop_lookup_org", { p_code: normalizeOrgCode(code) });
  const row = data && data.length > 0 ? data[0] : null;
  if (!row) return null;
  return { ...row, logoUrl: orgLogoUrl(supabase, row.logo_path) };
}

// Reads the columns needed to decide whether a session is still good. `session_epoch` arrived with the
// 2026-09-27 security migration; until that has been run the column doesn't exist, so retry without it
// (epoch 0) rather than treating every school as missing.
type OrgState = { id: string; active: boolean | null; session_epoch: number };
export async function loadOrgState(orgId: string): Promise<OrgState | null> {
  const admin = createAdminClient();
  const first = await admin.from("organizations").select("id, active, session_epoch").eq("id", orgId).maybeSingle();
  if (!first.error) return first.data ? { ...first.data, session_epoch: first.data.session_epoch ?? 0 } : null;
  const fallback = await admin.from("organizations").select("id, active").eq("id", orgId).maybeSingle();
  return fallback.data ? { ...fallback.data, session_epoch: 0 } : null;
}

// The ONE way server code should read the staff session. Beyond checking the cookie's signature and expiry it
// confirms the school still exists and isn't suspended, and that no password or passphrase has changed since
// the cookie was issued (the cookie's epoch must equal the school's current session_epoch) — so changing a
// password signs everyone out right away, and suspending a school stops its API writes too.
export async function getActiveSession(): Promise<{ orgId: string; tier: AccessTier } | null> {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  const org = await loadOrgState(session.orgId);
  // `=== false` (not just falsy) so a database without the `active` column yet reads as active.
  if (!org || org.active === false || org.session_epoch !== session.epoch) return null;
  return { orgId: session.orgId, tier: session.tier };
}

// Resolves the org for a /plan/[code] request, but only if the caller has
// already passed the code+password gate for THAT SPECIFIC code — a valid
// cookie for org A doesn't grant access to org B's URL, and a stale cookie
// pointing at a since-renamed code doesn't grant access either.
export async function getVerifiedOrg(
  code: string
): Promise<(Organization & { logoUrl: string | null; tier: AccessTier }) | null> {
  const session = await getActiveSession();
  if (!session) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id, name, org_code, logo_path, active, created_at")
    .eq("id", session.orgId)
    .single();

  // A suspended org's staff can't be given a way back in just because their
  // cookie predates the suspension. `=== false` (not just falsy) so this
  // defaults open if the `active` migration hasn't run yet.
  if (!data || data.org_code.toUpperCase() !== normalizeOrgCode(code) || data.active === false) return null;
  return { ...data, logoUrl: orgLogoUrl(admin, data.logo_path), tier: session.tier };
}
