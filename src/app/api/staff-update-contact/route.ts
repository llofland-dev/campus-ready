import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";

// Facility Admin's one editing capability: update a contact's phone/email,
// no login required — same signed-cookie gate as every other public read,
// just with a narrow write path layered on top. Deliberately accepts and
// touches nothing except these two columns, no matter what else is in the
// request body, so this can never become a path to editing plan structure.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session || session.tier !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { contactId, phone, email } = (await request.json()) as {
    contactId?: string;
    phone?: string;
    email?: string;
  };

  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .update({ phone: phone?.trim() || null, email: email?.trim() || null })
    .eq("id", contactId)
    .eq("org_id", session.orgId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
