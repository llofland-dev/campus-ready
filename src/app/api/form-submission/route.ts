import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";
import { isUuid, jsonError, readJsonObject } from "@/lib/api-utils";

const MAX_FIELDS = 100;
const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 5000;

// Saves what was actually filled in, independent of whether the mailto: step
// that follows on the client reaches anyone's inbox — a misconfigured mail
// app on someone's phone shouldn't mean an Incident Report is just gone.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return jsonError("Not authorized", 403);
  }

  const body = await readJsonObject(request);
  if (!body || !isUuid(body.formId) || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return jsonError("Missing or invalid fields", 400);
  }

  // Only plain string answers, bounded in count and size — this endpoint is
  // reachable by anyone who has the plan code, so it shouldn't accept an
  // arbitrary blob into the database.
  const entries = Object.entries(body.data as Record<string, unknown>);
  if (entries.length > MAX_FIELDS) {
    return jsonError("Too many fields", 400);
  }
  const data: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (key.length > MAX_KEY_LENGTH || typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      return jsonError("Missing or invalid fields", 400);
    }
    data[key] = value;
  }

  const admin = createAdminClient();

  // The form must belong to the caller's own org — the foreign key alone
  // only proves the form exists somewhere, not that it's theirs.
  const { data: form } = await admin
    .from("forms")
    .select("id")
    .eq("id", body.formId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!form) {
    return jsonError("Form not found", 404);
  }

  const { error } = await admin.from("form_submissions").insert({
    org_id: session.orgId,
    form_id: body.formId,
    data,
  });

  if (error) {
    console.error("form_submissions insert failed:", error.message);
    return jsonError("Couldn't save the submission", 500);
  }

  return NextResponse.json({ ok: true });
}
