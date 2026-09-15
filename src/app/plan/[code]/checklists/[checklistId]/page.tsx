import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Checklist, ChecklistItem, Incident } from "@/lib/supabase/types";
import { categoryByKey } from "@/lib/categories";
import { fetchCategoryContent, leafBackHref } from "@/lib/category-items";
import { PlanHeader } from "../../plan-header";
import { ChecklistRunner } from "./checklist-runner";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ code: string; checklistId: string }>;
}) {
  const { code, checklistId } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();

  const [{ data: checklist }, { data: items }, { data: activeIncident }] = await Promise.all([
    admin
      .from("checklists")
      .select("id, org_id, title, description, category, home_category, subcategory, sort_order, created_at")
      .eq("id", checklistId)
      .eq("org_id", org.id)
      .maybeSingle<Checklist>(),
    admin
      .from("checklist_items")
      .select("id, checklist_id, org_id, text, sort_order")
      .eq("checklist_id", checklistId)
      .eq("org_id", org.id)
      .order("sort_order")
      .returns<ChecklistItem[]>(),
    admin
      .from("incidents")
      .select("id, org_id, name, status, started_at, closed_at")
      .eq("org_id", org.id)
      .eq("status", "active")
      .maybeSingle<Incident>(),
  ]);

  if (!checklist) notFound();

  const checklistCategory = checklist.home_category ? categoryByKey(checklist.home_category) : undefined;
  if (checklistCategory?.requiresAdminTier && org.tier !== "admin") redirect(`/plan/${code}`);

  let backHref = `/plan/${code}/checklists`;
  if (checklist.home_category) {
    const { allSections, sections, checklists } = await fetchCategoryContent(
      admin,
      org.id,
      checklist.home_category
    );
    backHref = leafBackHref(
      code,
      checklist.home_category,
      checklist.subcategory,
      allSections,
      sections,
      checklists
    );
  }

  return (
    <div>
      <PlanHeader title={checklist.title} backHref={backHref} logoUrl={org.logoUrl} />

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {checklist.description && (
          <p className="rounded-xl bg-white p-4 text-sm text-zinc-700 shadow-sm dark:bg-zinc-950 dark:text-zinc-300">
            {checklist.description}
          </p>
        )}
        <ChecklistRunner checklist={checklist} items={items ?? []} activeIncident={activeIncident ?? null} />
      </div>
    </div>
  );
}
