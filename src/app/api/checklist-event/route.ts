import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";
import { isUuid, jsonError, readJsonObject } from "@/lib/api-utils";
import { categoryByKey } from "@/lib/categories";

const MAX_ACTOR_NAME_LENGTH = 100;

// Records one checklist check-off/uncheck as a timestamped, incident-scoped
// event. Fire-and-forget from the client (see checklist-runner.tsx) — the
// checkbox UI itself never depends on this succeeding, since it must keep
// working with no connectivity.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return jsonError("Not authorized", 403);
  }

  const body = await readJsonObject(request);
  if (
    !body ||
    !isUuid(body.checklistId) ||
    !isUuid(body.itemId) ||
    (body.action !== "checked" && body.action !== "unchecked")
  ) {
    return jsonError("Missing or invalid fields", 400);
  }

  const actorName = typeof body.actorName === "string" ? body.actorName.trim().slice(0, MAX_ACTOR_NAME_LENGTH) : "";

  const admin = createAdminClient();

  // This log is evidence for an After-Action Review, so its content comes
  // from the database, not the request: the item must really belong to this
  // checklist in the caller's org, and the recorded text is the stored one —
  // a client can't invent or reword what was "checked".
  const { data: item } = await admin
    .from("checklist_items")
    .select("id, text")
    .eq("id", body.itemId)
    .eq("checklist_id", body.checklistId)
    .eq("org_id", session.orgId)
    .maybeSingle<{ id: string; text: string }>();

  if (!item) {
    return jsonError("Checklist item not found", 404);
  }

  // Admin-tier checklists (e.g. the Incident Management job action sheets)
  // must not take events from a User-level session, even one that somehow
  // learned an item id — the pages hide them, and this enforces it here too.
  const { data: checklist } = await admin
    .from("checklists")
    .select("home_category")
    .eq("id", body.checklistId)
    .eq("org_id", session.orgId)
    .maybeSingle<{ home_category: string | null }>();
  const category = checklist?.home_category ? categoryByKey(checklist.home_category) : undefined;
  if (category?.requiresAdminTier && session.tier !== "admin") {
    return jsonError("Not authorized", 403);
  }

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
    checklist_id: body.checklistId,
    checklist_item_id: item.id,
    item_text: item.text,
    action: body.action,
    actor_name: actorName || null,
  });

  if (error) {
    console.error("checklist_events insert failed:", error.message);
    return jsonError("Couldn't record the event", 500);
  }

  return NextResponse.json({ ok: true });
}
