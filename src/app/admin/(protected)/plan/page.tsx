import { createClient } from "@/lib/supabase/server";
import type { PlanPage, PlanSection, Profile } from "@/lib/supabase/types";
import { PlanEditor } from "./plan-editor";

export default async function AdminPlanPage() {
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

  const [{ data: sections }, { data: pages }] = await Promise.all([
    supabase
      .from("plan_sections")
      .select("id, org_id, title, color_key, icon_path, category, sort_order, created_at")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<PlanSection[]>(),
    supabase
      .from("plan_pages")
      .select("id, section_id, org_id, title, body, sort_order, created_at, updated_at")
      .eq("org_id", profile.org_id)
      .order("sort_order")
      .returns<PlanPage[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Plan content</h2>
        <p className="text-sm text-zinc-500">
          Sections are the tabs staff flip through; each section holds one or more pages.
        </p>
      </div>

      <PlanEditor orgId={profile.org_id} sections={sections ?? []} pages={pages ?? []} />
    </div>
  );
}
