import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCategoryContent, buildCategoryTopItems } from "@/lib/category-items";
import { categoryByKey } from "@/lib/categories";
import { AlertIcon, ChevronRightIcon } from "@/components/icons";
import { PlanHeader } from "../plan-header";

// Facility-Admin-tier only. Merges what used to be the separate "Incident
// Command" category tile (ICS reference content — roles, order of
// succession references, recovery/continuity, etc., still stored under
// plan_sections.category = "ics") with the incident action panel, behind
// one "Incident Status" button — see lib/categories.ts for why "ics" is
// excluded from the generic category-tile loop that used to render this.
export default async function IncidentManagementPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);
  if (org.tier !== "admin") redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { allSections, sections, checklists } = await fetchCategoryContent(admin, org.id, "ics");
  const items = buildCategoryTopItems(code, "ics", allSections, sections, checklists, admin);

  const color = categoryByKey("ics")!.color;

  return (
    <div>
      <PlanHeader
        title="Incident Management"
        backHref={`/plan/${code}`}
        color={color.button}
        logoUrl={org.logoUrl}
      />

      <div className="mx-auto max-w-lg p-4">
        <div className="space-y-2">
          <Link
            href={`/plan/${code}/incident-management/status`}
            className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-amber-100 px-4 py-3 font-medium text-zinc-800 transition-colors hover:bg-amber-200 dark:bg-amber-950/30 dark:text-zinc-100"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <AlertIcon className="h-5 w-5" />
              </span>
              <span>
                Incident Status
                <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                  Start, update, or close an incident
                </span>
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <ChevronRightIcon className="h-5 w-5" />
            </span>
          </Link>

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
      </div>
    </div>
  );
}
