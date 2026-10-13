import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanMap } from "@/lib/supabase/types";
import { MAPS_COLOR } from "@/lib/palette";
import { ChevronRightIcon } from "@/components/icons";
import { MAP_TYPES } from "@/lib/plan-maps";
import { PlanHeader } from "../plan-header";

export default async function MapsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { data } = await admin
    .from("plan_maps")
    .select("id, org_id, title, description, category, file_path, content_type, file_size, sort_order, created_at")
    .eq("org_id", org.id)
    .order("sort_order")
    .returns<PlanMap[]>();
  const maps = data ?? [];

  // Group under the admin's labels (e.g. "Main Building"), in the order the first map of each label
  // appears. Maps with no label go last under a generic heading, but only when other maps do have one.
  const groups = new Map<string, PlanMap[]>();
  for (const map of maps) {
    const key = map.category?.trim() || "";
    groups.set(key, [...(groups.get(key) ?? []), map]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : 0) - (b === "" ? 1 : 0));
  const anyLabelled = ordered.some(([label]) => label !== "");

  return (
    <div>
      <PlanHeader title="Maps" backHref={`/plan/${code}`} logoUrl={org.logoUrl} color={MAPS_COLOR.button} />

      <div className="mx-auto max-w-lg space-y-6 p-4">
        {ordered.map(([label, list]) => (
          <section key={label || "other"} className="space-y-2">
            {anyLabelled && (
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label || "Other maps"}</h2>
            )}
            <div className="space-y-2">
              {list.map((map) => (
                <Link
                  key={map.id}
                  href={`/plan/${code}/maps/${map.id}`}
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium text-zinc-800 transition-colors ${MAPS_COLOR.row} ${MAPS_COLOR.rowHover}`}
                >
                  <span className="min-w-0">
                    <span className="block">{map.title}</span>
                    <span className="block truncate text-xs font-normal text-zinc-600">
                      {[MAP_TYPES[map.content_type]?.label, map.description].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${MAPS_COLOR.button} ${MAPS_COLOR.buttonText}`}>
                    <ChevronRightIcon className="h-5 w-5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {maps.length === 0 && <p className="p-4 text-center text-sm text-zinc-500">No maps yet.</p>}
      </div>
    </div>
  );
}
