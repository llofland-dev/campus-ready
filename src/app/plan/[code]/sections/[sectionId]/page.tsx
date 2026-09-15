import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Checklist, PlanPage, PlanSection } from "@/lib/supabase/types";
import { colorForSection } from "@/lib/palette";
import { categoryByKey } from "@/lib/categories";
import { leafBackHref } from "@/lib/category-items";
import { ChevronRightIcon } from "@/components/icons";
import { PlanHeader } from "../../plan-header";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ code: string; sectionId: string }>;
}) {
  const { code, sectionId } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();

  const [{ data: allSections }, { data: pages }] = await Promise.all([
    admin
      .from("plan_sections")
      .select("id, org_id, title, color_key, category, subcategory, sort_order, created_at")
      .eq("org_id", org.id)
      .order("sort_order")
      .returns<PlanSection[]>(),
    admin
      .from("plan_pages")
      .select("id, section_id, org_id, title, body, sort_order, created_at, updated_at")
      .eq("section_id", sectionId)
      .eq("org_id", org.id)
      .order("sort_order")
      .returns<PlanPage[]>(),
  ]);

  const sections = allSections ?? [];
  const sectionIndex = sections.findIndex((s) => s.id === sectionId);
  const section = sectionIndex >= 0 ? sections[sectionIndex] : null;
  if (!section) notFound();

  const sectionCategory = section.category ? categoryByKey(section.category) : undefined;
  if (sectionCategory?.requiresAdminTier && org.tier !== "admin") redirect(`/plan/${code}`);

  const color = colorForSection(section, sectionIndex);

  let backHref = `/plan/${code}`;
  if (section.category) {
    const { data: categoryChecklists } = await admin
      .from("checklists")
      .select("id, org_id, title, category, home_category, subcategory, sort_order, created_at")
      .eq("org_id", org.id)
      .eq("home_category", section.category)
      .returns<Checklist[]>();
    const categorySections = sections.filter((s) => s.category === section.category);
    backHref = leafBackHref(
      code,
      section.category,
      section.subcategory,
      sections,
      categorySections,
      categoryChecklists ?? []
    );
  }

  return (
    <div>
      <PlanHeader title={section.title} backHref={backHref} color={color.button} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
        {pages && pages.length > 0 ? (
          <div className="space-y-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/plan/${code}/sections/${sectionId}/pages/${page.id}`}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium text-zinc-800 transition-colors ${color.row} ${color.rowHover}`}
              >
                <span>{page.title}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.button} ${color.buttonText}`}>
                  <ChevronRightIcon className="h-5 w-5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-zinc-500">This section has no pages yet.</p>
        )}
      </div>
    </div>
  );
}
