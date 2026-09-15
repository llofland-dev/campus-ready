import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Only ever use this after
// verifying the caller's org via lib/eop-session.ts and scoping every query
// explicitly to that org_id — this client will happily read/write any org's
// data otherwise. The `server-only` import makes it a build error to pull
// this into a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
