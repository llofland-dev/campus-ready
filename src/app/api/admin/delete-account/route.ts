import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeOrgCode } from "@/lib/eop-org";
import { jsonError, readJsonObject } from "@/lib/api-utils";

// Shared demonstration orgs (comma-separated plan codes) that must never be
// deleted, even by their own login — the demo account is handed to App Store /
// Play reviewers and prospects, and a deleted demo breaks every walkthrough.
const PROTECTED_ORG_CODES = (process.env.PROTECTED_ORG_CODES ?? "MAPLERIDGE")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

const STORAGE_BUCKETS = ["org-logos", "section-icons"];

async function removeOrgFiles(admin: ReturnType<typeof createAdminClient>, orgId: string) {
  for (const bucket of STORAGE_BUCKETS) {
    const paths: string[] = [];

    async function walk(prefix: string) {
      const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      for (const entry of data ?? []) {
        const fullPath = `${prefix}/${entry.name}`;
        // Storage lists sub-folders as entries with no id.
        if (entry.id === null) await walk(fullPath);
        else paths.push(fullPath);
      }
    }

    await walk(orgId);
    for (let i = 0; i < paths.length; i += 100) {
      await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
    }
  }
}

// Self-service account deletion, reachable from the admin dashboard. Required
// by Apple (guideline 5.1.1(v)) and Google Play for any app that lets people
// create an account. In this app an admin account and its organization are
// created together, so deleting the organization's only admin deletes the
// organization and everything in it (cascading through the foreign keys);
// if other admins exist, only the caller's own login is removed.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Not authorized", 401);
  }

  const body = await readJsonObject(request);
  const confirm = typeof body?.confirm === "string" ? body.confirm : "";

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string | null }>();

  let org: { id: string; org_code: string } | null = null;
  if (profile?.org_id) {
    const { data } = await admin
      .from("organizations")
      .select("id, org_code")
      .eq("id", profile.org_id)
      .maybeSingle<{ id: string; org_code: string }>();
    org = data;
  }

  if (org && PROTECTED_ORG_CODES.includes(org.org_code.toUpperCase())) {
    return jsonError(
      "This is a shared demonstration account, so it can't be deleted. Contact support if you need it removed.",
      403
    );
  }

  // Typing the plan code (or DELETE, if no organization was ever created) is
  // the guard against a stray tap destroying a whole plan.
  const expected = org ? org.org_code.toUpperCase() : "DELETE";
  if (normalizeOrgCode(confirm) !== expected) {
    return jsonError(org ? "Type your plan code exactly to confirm." : "Type DELETE to confirm.", 400);
  }

  let deleteOrg = false;
  if (org) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    deleteOrg = (count ?? 1) <= 1;
  }

  if (org && deleteOrg) {
    try {
      await removeOrgFiles(admin, org.id);
    } catch (err) {
      // Orphaned files are a cleanup issue, not a reason to block the deletion.
      console.error("org file cleanup failed:", err instanceof Error ? err.message : err);
    }

    // profiles.org_id has no ON DELETE action, so detach first; every content
    // table cascades from the organization.
    await admin.from("profiles").update({ org_id: null }).eq("id", user.id);
    const { error: orgError } = await admin.from("organizations").delete().eq("id", org.id);
    if (orgError) {
      console.error("organization delete failed:", orgError.message);
      await admin.from("profiles").update({ org_id: org.id }).eq("id", user.id);
      return jsonError("Couldn't delete your organization. Please try again or contact support.", 500);
    }
  }

  // The profile row cascades from the auth user.
  const { error: userError } = await admin.auth.admin.deleteUser(user.id);
  if (userError) {
    console.error("auth user delete failed:", userError.message);
    return jsonError("Couldn't delete your account. Please try again or contact support.", 500);
  }

  return NextResponse.json({ ok: true, deletedOrganization: Boolean(org && deleteOrg) });
}
