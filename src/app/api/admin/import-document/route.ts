import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseDocumentAsSection,
  parseDocumentAsChecklist,
  extensionOf,
  UserFacingImportError,
} from "@/lib/document-import";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Reading a large PDF or workbook can outlast the default serverless limit.
export const maxDuration = 60;

// Parses an uploaded document into a draft only — nothing is written to the
// database here. The admin reviews/edits the draft client-side and publishes
// it themselves via the normal Supabase-client inserts (see import-form.tsx),
// same RLS-scoped path as every other admin write in this app.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = formData.get("file");
  const targetType = formData.get("targetType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  // Vercel rejects request bodies over ~4.5 MB with an opaque platform error;
  // checking first gives the admin a clear message instead.
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That file is too large — the limit is 4 MB." }, { status: 413 });
  }
  if (targetType !== "section" && targetType !== "checklist") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }
  if (!extensionOf(file.name)) {
    return NextResponse.json({ error: "Only .docx, .xlsx, and .pdf files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const draft =
      targetType === "section"
        ? await parseDocumentAsSection(buffer, file.name)
        : await parseDocumentAsChecklist(buffer, file.name);
    return NextResponse.json({ targetType, draft });
  } catch (err) {
    // A file the admin can simply swap for a better one (a scanned PDF, an
    // empty spreadsheet) gets the specific reason, not the generic message.
    if (err instanceof UserFacingImportError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("document import failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Couldn't read that document. Make sure it's a valid, unprotected .docx, .xlsx, or .pdf file." },
      { status: 422 }
    );
  }
}
