import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Checklist } from "@/lib/supabase/types";
import { colorForIndex } from "@/lib/palette";
import { ChevronRightIcon } from "@/components/icons";
import { PlanHeader } from "../plan-header";

export default async function ChecklistsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { data: allChecklists } = await admin
    .from("checklists")
    .select("id, org_id, title, category, home_category, sort_order, created_at")
    .eq("org_id", org.id)
    .order("sort_order")
    .returns<Checklist[]>();

  // A checklist assigned to a home tile (e.g. Incident Command -> Job Action Sheets)
  // lives there, not here too — this list is only for checklists with no
  // home tile of their own.
  const checklists = (allChecklists ?? []).filter((c) => !c.home_category);

  return (
    <div>
      <PlanHeader title="Checklists" backHref={`/plan/${code}`} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
        {checklists.length > 0 ? (
          <div className="space-y-2">
            {checklists.map((checklist, index) => {
              const color = colorForIndex(index);
              return (
                <Link
                  key={checklist.id}
                  href={`/plan/${code}/checklists/${checklist.id}`}
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium text-zinc-800 transition-colors ${color.row} ${color.rowHover}`}
                >
                  <span>
                    <span className="block">{checklist.title}</span>
                    {checklist.category && (
                      <span className="block text-xs font-normal text-zinc-600">{checklist.category}</span>
                    )}
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.button} ${color.buttonText}`}>
                    <ChevronRightIcon className="h-5 w-5" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-zinc-500">No checklists yet.</p>
        )}
      </div>
    </div>
  );
}
