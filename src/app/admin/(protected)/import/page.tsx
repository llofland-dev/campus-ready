import { createClient } from "@/lib/supabase/server";
import type { Checklist, PlanSection, Profile } from "@/lib/supabase/types";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, role, display_name, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile?.org_id) return null;

  const [{ data: sections }, { data: checklists }] = await Promise.all([
    supabase
      .from("plan_sections")
      .select("id, org_id, title, color_key, category, subcategory, sort_order, created_at")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<PlanSection[]>(),
    supabase
      .from("checklists")
      .select("id, org_id, title, description, category, home_category, subcategory, sort_order, created_at")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<Checklist[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Import from Word</h2>
        <p className="text-sm text-zinc-500">
          Upload a Word, Excel, or PDF file and review the parsed result before publishing —
          nothing goes live until you approve it. Word documents parse with the most structure
          (bold text, tables); PDFs are plain text only, so expect more cleanup in the review step.
        </p>
      </div>

      <ImportForm orgId={profile.org_id} sections={sections ?? []} checklists={checklists ?? []} />
    </div>
  );
}
