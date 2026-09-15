import { createClient } from "@/lib/supabase/server";
import type { Checklist, ChecklistItem, Profile } from "@/lib/supabase/types";
import { ChecklistsEditor } from "./checklists-editor";

export default async function AdminChecklistsPage() {
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

  const [{ data: checklists }, { data: items }] = await Promise.all([
    supabase
      .from("checklists")
      .select("id, org_id, title, description, category, home_category, subcategory, sort_order, created_at")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<Checklist[]>(),
    supabase
      .from("checklist_items")
      .select("id, checklist_id, org_id, text, sort_order")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<ChecklistItem[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Checklists</h2>
        <p className="text-sm text-zinc-500">
          E.g. one checklist per incident-command role, or per drill scenario. Staff check items
          off on their own device — nothing here syncs back.
        </p>
      </div>

      <ChecklistsEditor orgId={profile.org_id} checklists={checklists ?? []} items={items ?? []} />
    </div>
  );
}
