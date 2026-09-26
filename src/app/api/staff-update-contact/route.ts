import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveSession } from "@/lib/eop-org";
import { clientKey, recordHit, tooManyRequests } from "@/lib/rate-limit";
import { isUuid, jsonError, readJsonObject } from "@/lib/api-utils";

const MAX_PHONE_LENGTH = 40;
const MAX_EMAIL_LENGTH = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Facility Admin's one editing capability: update a contact's phone/email,
// no login required — same signed-cookie gate as every other public read,
// just with a narrow write path layered on top. Deliberately accepts and
// touches nothing except these two columns, no matter what else is in the
// request body, so this can never become a path to editing plan structure.
export async function POST(request: Request) {
  const session = await getActiveSession();

  if (!session || session.tier !== "admin") {
    return jsonError("Not authorized", 403);
  }

  // Abuse guard, not a normal-use limit: generous enough for a whole school behind one Wi-Fi address.
  const limited = await recordHit("write:contact", `${session.orgId}:${clientKey(request)}`, 120, 15 * 60);
  if (limited.blocked) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  if (!body || !isUuid(body.contactId)) {
    return jsonError("Missing or invalid contactId", 400);
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (phone.length > MAX_PHONE_LENGTH) {
    return jsonError("That phone number is too long.", 400);
  }
  if (email && (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email))) {
    return jsonError("That doesn't look like a valid email address.", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .update({ phone: phone || null, email: email || null })
    .eq("id", body.contactId)
    .eq("org_id", session.orgId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("contacts update failed:", error.message);
    return jsonError("Couldn't save — try again.", 500);
  }
  if (!data) {
    return jsonError("Contact not found", 404);
  }

  return NextResponse.json({ ok: true });
}
