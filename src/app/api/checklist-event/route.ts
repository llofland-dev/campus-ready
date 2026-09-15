import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";

// Records one checklist check-off/uncheck as a timestamped, incident-scoped
// event. Fire-and-forget from the client (see checklist-runner.tsx) — the
// checkbox UI itself never depends on this succeeding, since it must keep
// working with no connectivity.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { checklistId, itemId, itemText, action, actorName } = (await request.json()) as {
    checklistId?: string;
    itemId?: string;
    itemText?: string;
    action?: "checked" | "unchecked";
    actorName?: string;
  };

  if (!checklistId || !itemId || !itemText || (action !== "checked" && action !== "unchecked")) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // At most one active incident per org (enforced by a partial unique index
  // too) — every check-off while one is active attaches to it automatically,
  // with no extra input from whoever's checking the box.
  const { data: incident } = await admin
    .from("incidents")
    .select("id")
    .eq("org_id", session.orgId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  const { error } = await admin.from("checklist_events").insert({
    org_id: session.orgId,
    incident_id: incident?.id ?? null,
    checklist_id: checklistId,
    checklist_item_id: itemId,
    item_text: itemText,
    action,
    actor_name: actorName?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
