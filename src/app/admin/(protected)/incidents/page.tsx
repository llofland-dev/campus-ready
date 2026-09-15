import { createClient } from "@/lib/supabase/server";
import type { Incident, Profile } from "@/lib/supabase/types";
import { IncidentsPanel } from "./incidents-panel";

export default async function AdminIncidentsPage() {
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

  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, org_id, name, status, started_at, closed_at")
    .eq("org_id", profile.org_id)
    .order("started_at", { ascending: false })
    .returns<Incident[]>();

  const activeIncident = (incidents ?? []).find((i) => i.status === "active") ?? null;
  const closedIncidents = (incidents ?? []).filter((i) => i.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Incidents</h2>
        <p className="text-sm text-zinc-500">
          A timestamped log of checklist activity during real events — evidence for an
          After-Action Review, not the AAR itself.
        </p>
      </div>

      <IncidentsPanel orgId={profile.org_id} activeIncident={activeIncident} closedIncidents={closedIncidents} />
    </div>
  );
}
