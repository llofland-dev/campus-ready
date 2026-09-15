import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/eop-session";

// Saves what was actually filled in, independent of whether the mailto: step
// that follows on the client reaches anyone's inbox — a misconfigured mail
// app on someone's phone shouldn't mean an Incident Report is just gone.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { formId, data } = (await request.json()) as {
    formId?: string;
    data?: Record<string, string>;
  };

  if (!formId || !data) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("form_submissions").insert({
    org_id: session.orgId,
    form_id: formId,
    data,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
