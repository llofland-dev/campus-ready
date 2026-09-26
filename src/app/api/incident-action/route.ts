import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveSession } from "@/lib/eop-org";
import { clientKey, recordHit, tooManyRequests } from "@/lib/rate-limit";

// Lets a Facility Admin (passphrase tier — no account/login) start, post an
// update to, or close an incident directly from the staff-facing app, the
// same way the full admin dashboard's Incidents page does — so whoever is
// actually on-site during a real event isn't stuck going to find a separate
// login. Same signed-cookie gate as staff-update-contact, same
// service-role write path as every other public write in this app.
export async function POST(request: Request) {
  const session = await getActiveSession();

  if (!session || session.tier !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Abuse guard, not a normal-use limit: generous enough for a whole school behind one Wi-Fi address.
  const limited = await recordHit("write:incident", `${session.orgId}:${clientKey(request)}`, 120, 15 * 60);
  if (limited.blocked) return tooManyRequests(limited.retryAfterSeconds);

  const { action, name, message, incidentId } = (await request.json()) as {
    action?: "start" | "post_update" | "close";
    name?: string;
    message?: string;
    incidentId?: string;
  };

  const admin = createAdminClient();

  if (action === "start") {
    const { error } = await admin.from("incidents").insert({
      org_id: session.orgId,
      // Fallback only: the staff app sends its own name, in the admin's timezone. This server runs
      // in UTC, so say so instead of printing a time that looks local but isn't.
      name: name?.trim() || `Incident – ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "post_update") {
    if (!incidentId || !message?.trim()) {
      return NextResponse.json({ error: "Missing incidentId or message" }, { status: 400 });
    }
    const { error } = await admin.from("incident_updates").insert({
      org_id: session.orgId,
      incident_id: incidentId,
      message: message.trim(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    if (!incidentId) {
      return NextResponse.json({ error: "Missing incidentId" }, { status: 400 });
    }
    const { error } = await admin
      .from("incidents")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", incidentId)
      .eq("org_id", session.orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
