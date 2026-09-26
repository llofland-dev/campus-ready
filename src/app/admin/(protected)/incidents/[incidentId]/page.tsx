import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistEvent, Contact, Incident, IncidentUpdate, Profile } from "@/lib/supabase/types";
import { MailIncidentReport } from "@/components/mail-incident-report";
import { ClientTime } from "@/components/client-time";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
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

  const [{ data: incident }, { data: events }, { data: updates }, { data: org }, { data: emailContacts }] =
    await Promise.all([
      supabase
        .from("incidents")
        .select("id, org_id, name, status, started_at, closed_at")
        .eq("id", incidentId)
        .eq("org_id", profile.org_id)
        .maybeSingle<Incident>(),
      supabase
        .from("checklist_events")
        .select("id, org_id, incident_id, checklist_id, checklist_item_id, item_text, action, actor_name, created_at")
        .eq("incident_id", incidentId)
        .eq("org_id", profile.org_id)
        .order("created_at")
        .returns<ChecklistEvent[]>(),
      supabase
        .from("incident_updates")
        .select("id, org_id, incident_id, message, created_at")
        .eq("incident_id", incidentId)
        .eq("org_id", profile.org_id)
        .order("created_at")
        .returns<IncidentUpdate[]>(),
      supabase.from("organizations").select("name").eq("id", profile.org_id).single(),
      supabase
        .from("contacts")
        .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
        .eq("org_id", profile.org_id)
        .not("email", "is", null)
        .order("sort_order")
        .returns<Contact[]>(),
    ]);

  if (!incident) notFound();

  const contactOptions = (emailContacts ?? []).map((c) => ({
    name: c.name,
    roleTitle: c.role_title,
    email: c.email!,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/incidents" className="text-sm underline">
          ← Incidents
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-black dark:text-zinc-50">{incident.name}</h2>
        <p className="text-sm text-zinc-500">
          <ClientTime iso={incident.started_at} />
          {incident.closed_at ? (
            <>
              {" – "}
              <ClientTime iso={incident.closed_at} />
            </>
          ) : (
            " (active)"
          )}
        </p>
      </div>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <MailIncidentReport
          orgName={org?.name ?? ""}
          incidentName={incident.name}
          startedAt={incident.started_at}
          closedAt={incident.closed_at}
          updates={updates ?? []}
          contactOptions={contactOptions}
        />
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Family-facing updates posted during this incident
        </h3>
        {!updates || updates.length === 0 ? (
          <p className="text-sm text-zinc-500">None were posted.</p>
        ) : (
          <ul className="space-y-2">
            {updates.map((u) => (
              <li key={u.id} className="text-sm">
                <span className="text-zinc-400">
                  <ClientTime iso={u.created_at} />
                </span>{" "}
                <span className="text-black dark:text-zinc-50">{u.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Timeline</h3>
        {!events || events.length === 0 ? (
          <p className="text-sm text-zinc-500">No checklist activity logged for this incident.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="text-zinc-400">
                  <ClientTime iso={event.created_at} timeOnly />
                </span>{" "}
                <span className={event.action === "checked" ? "text-black dark:text-zinc-50" : "text-zinc-400 line-through"}>
                  {event.item_text}
                </span>
                {event.actor_name && <span className="text-zinc-500"> — {event.actor_name}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
