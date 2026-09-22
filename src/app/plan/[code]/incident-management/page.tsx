import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Incident, IncidentUpdate } from "@/lib/supabase/types";
import { PlanHeader } from "../plan-header";
import { IncidentManagementPanel } from "./incident-management-panel";

// Facility-Admin-tier only (same passphrase that unlocks Incident Command),
// mirroring the ICS category gate in sections/[sectionId]/page.tsx — this
// is the on-the-ground counterpart to the full admin dashboard's Incidents
// page, reachable without a separate Supabase Auth login.
export default async function IncidentManagementPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);
  if (org.tier !== "admin") redirect(`/plan/${code}`);

  const admin = createAdminClient();

  const { data: incidents } = await admin
    .from("incidents")
    .select("id, org_id, name, status, started_at, closed_at")
    .eq("org_id", org.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .returns<Incident[]>();
  const activeIncident = incidents?.[0] ?? null;

  const { data: updates } = activeIncident
    ? await admin
        .from("incident_updates")
        .select("id, org_id, incident_id, message, created_at")
        .eq("incident_id", activeIncident.id)
        .order("created_at", { ascending: false })
        .returns<IncidentUpdate[]>()
    : { data: [] as IncidentUpdate[] };

  return (
    <div>
      <PlanHeader title="Incident Management" backHref={`/plan/${code}`} logoUrl={org.logoUrl} />
      <div className="mx-auto max-w-lg p-4">
        <IncidentManagementPanel code={code} activeIncident={activeIncident} updates={updates ?? []} />
      </div>
    </div>
  );
}
