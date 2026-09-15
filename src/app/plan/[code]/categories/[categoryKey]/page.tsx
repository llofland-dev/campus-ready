import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryByKey } from "@/lib/categories";
import { fetchCategoryContent, buildCategoryTopItems } from "@/lib/category-items";
import { ChevronRightIcon } from "@/components/icons";
import { PlanHeader } from "../../plan-header";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ code: string; categoryKey: string }>;
}) {
  const { code, categoryKey } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const category = categoryByKey(categoryKey);
  if (!category) notFound();
  if (category.requiresAdminTier && org.tier !== "admin") redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { allSections, sections, checklists } = await fetchCategoryContent(admin, org.id, categoryKey);
  const items = buildCategoryTopItems(code, categoryKey, allSections, sections, checklists, admin);

  if (items.length === 1) {
    redirect(items[0].href);
  }

  return (
    <div>
      <PlanHeader title={category.label} backHref={`/plan/${code}`} color={category.color.button} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium text-zinc-800 transition-colors ${item.color.row} ${item.color.rowHover}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {item.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    {item.sublabel && <span className="block text-xs font-normal text-zinc-600">{item.sublabel}</span>}
                  </span>
                </span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.color.button} ${item.color.buttonText}`}>
                  <ChevronRightIcon className="h-5 w-5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-zinc-500">
            No content published yet for {category.label}.
          </p>
        )}
      </div>
    </div>
  );
}
