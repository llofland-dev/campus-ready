import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanPage, PlanSection } from "@/lib/supabase/types";
import { colorForSection } from "@/lib/palette";
import { categoryByKey } from "@/lib/categories";
import { PlanHeader } from "../../../../plan-header";
import { Markdown } from "@/components/markdown";

export default async function PlanPageView({
  params,
}: {
  params: Promise<{ code: string; sectionId: string; pageId: string }>;
}) {
  const { code, sectionId, pageId } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();

  const [{ data: allSections }, { data: pages }] = await Promise.all([
    admin
      .from("plan_sections")
      .select("id, org_id, title, color_key, category, sort_order, created_at")
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

  const pageList = pages ?? [];
  const pageIndex = pageList.findIndex((p) => p.id === pageId);
  const page = pageIndex >= 0 ? pageList[pageIndex] : null;
  if (!page) notFound();

  const color = colorForSection(section, sectionIndex);
  const prev = pageIndex > 0 ? pageList[pageIndex - 1] : null;
  const next = pageIndex < pageList.length - 1 ? pageList[pageIndex + 1] : null;

  return (
    <div>
      <PlanHeader
        title={page.title}
        backHref={`/plan/${code}/sections/${sectionId}`}
        color={color.button}
        logoUrl={org.logoUrl}
      />

      <div className="mx-auto max-w-lg space-y-6 p-4">
        <article className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <Markdown>{page.body}</Markdown>
        </article>

        {(prev || next) && (
          <div className="flex items-center justify-between text-sm">
            {prev ? (
              <Link
                href={`/plan/${code}/sections/${sectionId}/pages/${prev.id}`}
                className={`rounded-full px-4 py-2 font-medium ${color.row} ${color.rowHover} text-zinc-800`}
              >
                ‹ {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/plan/${code}/sections/${sectionId}/pages/${next.id}`}
                className={`rounded-full px-4 py-2 font-medium ${color.row} ${color.rowHover} text-zinc-800`}
              >
                {next.title} ›
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
