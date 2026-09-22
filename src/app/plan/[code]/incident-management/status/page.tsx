import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact, Incident, IncidentUpdate } from "@/lib/supabase/types";
import { PlanHeader } from "../../plan-header";
import { IncidentManagementPanel } from "../incident-management-panel";

// Facility-Admin-tier only, same gate as the parent Incident Management
// page — this is the actual start/update/close action panel, one tap in
// from there via the "Incident Status" button.
export default async function IncidentStatusPage({ params }: { params: Promise<{ code: string }> }) {
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

  const { data: emailContacts } = await admin
    .from("contacts")
    .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
    .eq("org_id", org.id)
    .not("email", "is", null)
    .order("sort_order")
    .returns<Contact[]>();

  const contactOptions = (emailContacts ?? []).map((c) => ({
    name: c.name,
    roleTitle: c.role_title,
    email: c.email!,
  }));

  return (
    <div>
      <PlanHeader title="Incident Status" backHref={`/plan/${code}/incident-management`} logoUrl={org.logoUrl} />
      <div className="mx-auto max-w-lg p-4">
        <IncidentManagementPanel
          code={code}
          orgName={org.name}
          activeIncident={activeIncident}
          updates={updates ?? []}
          contactOptions={contactOptions}
        />
      </div>
    </div>
  );
}
