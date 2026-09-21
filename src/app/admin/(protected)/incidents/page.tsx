import { createClient } from "@/lib/supabase/server";
import type { Incident, IncidentUpdate, Profile } from "@/lib/supabase/types";
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

  const [{ data: org }, { data: incidents }] = await Promise.all([
    supabase.from("organizations").select("org_code").eq("id", profile.org_id).single(),
    supabase
      .from("incidents")
      .select("id, org_id, name, status, started_at, closed_at")
      .eq("org_id", profile.org_id)
      .order("started_at", { ascending: false })
      .returns<Incident[]>(),
  ]);

  const activeIncident = (incidents ?? []).find((i) => i.status === "active") ?? null;
  const closedIncidents = (incidents ?? []).filter((i) => i.status === "closed");

  const { data: updates } = activeIncident
    ? await supabase
        .from("incident_updates")
        .select("id, org_id, incident_id, message, created_at")
        .eq("incident_id", activeIncident.id)
        .order("created_at", { ascending: false })
        .returns<IncidentUpdate[]>()
    : { data: [] as IncidentUpdate[] };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Incidents</h2>
        <p className="text-sm text-zinc-500">
          A timestamped log of checklist activity during real events — evidence for an
          After-Action Review, not the AAR itself.
        </p>
      </div>

      <IncidentsPanel
        orgId={profile.org_id}
        orgCode={org?.org_code ?? ""}
        activeIncident={activeIncident}
        closedIncidents={closedIncidents}
        updates={updates ?? []}
      />
    </div>
  );
}
