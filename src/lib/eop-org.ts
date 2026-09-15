import "server-only";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

// Public, pre-auth lookup — just enough to know whether a code exists and
// whether to show a password field. Uses the anon key directly; safe
// because eop_lookup_org never returns the password hash.
export async function lookupOrgByCode(code: string): Promise<OrgLookup> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("eop_lookup_org", { p_code: code });
  const row = data && data.length > 0 ? data[0] : null;
  if (!row) return null;
  return { ...row, logoUrl: orgLogoUrl(supabase, row.logo_path) };
}

// Resolves the org for a /plan/[code] request, but only if the caller has
// already passed the code+password gate for THAT SPECIFIC code — a valid
// cookie for org A doesn't grant access to org B's URL, and a stale cookie
// pointing at a since-renamed code doesn't grant access either.
export async function getVerifiedOrg(
  code: string
): Promise<(Organization & { logoUrl: string | null; tier: AccessTier }) | null> {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
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
  if (!data || data.org_code !== code || data.active === false) return null;
  return { ...data, logoUrl: orgLogoUrl(admin, data.logo_path), tier: session.tier };
}
