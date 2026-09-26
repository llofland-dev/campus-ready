import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";

// Lets a Facility Admin (passphrase tier — no account/login) start, post an
// update to, or close an incident directly from the staff-facing app, the
// same way the full admin dashboard's Incidents page does — so whoever is
// actually on-site during a real event isn't stuck going to find a separate
// login. Same signed-cookie gate as staff-update-contact, same
// service-role write path as every other public write in this app.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session || session.tier !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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
