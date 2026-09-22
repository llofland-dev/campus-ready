import Link from "next/link";
import { getVerifiedOrg, lookupOrgByCode } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact, Incident, IncidentUpdate } from "@/lib/supabase/types";
import { CATEGORIES } from "@/lib/categories";
import { PALETTE } from "@/lib/palette";
import { AlertIcon, ChecklistIcon, ContactsIcon, FormsIcon, PhoneIcon } from "@/components/icons";
import { PlanHeader } from "./plan-header";
import { AccessGate } from "./access-gate";

export default async function PlanHubPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);

  if (!org) {
    const lookup = await lookupOrgByCode(code);

    if (!lookup) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 text-center dark:bg-black">
          <div className="space-y-2">
            <p className="text-lg font-medium text-black dark:text-zinc-50">Code not found</p>
            <p className="text-sm text-zinc-500">
              Double-check the plan code with your organization, or{" "}
              <Link href="/code" className="underline">
                try again
              </Link>
              .
            </p>
          </div>
        </div>
      );
    }

    return (
      <AccessGate
        code={code}
        orgName={lookup.name}
        hasPassword={lookup.has_password}
        hasAdminPassword={lookup.has_admin_password}
        logoUrl={lookup.logoUrl}
      />
    );
  }

  const admin = createAdminClient();
  const [{ data: pinnedContacts }, { data: activeIncidents }] = await Promise.all([
    admin
      .from("contacts")
      .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
      .eq("org_id", org.id)
      .eq("pinned", true)
      .order("sort_order")
      .returns<Contact[]>(),
    admin
      .from("incidents")
      .select("id, org_id, name, status, started_at, closed_at")
      .eq("org_id", org.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .returns<Incident[]>(),
  ]);
  const activeIncident = activeIncidents?.[0] ?? null;

  const { data: latestUpdate } = activeIncident
    ? await admin
        .from("incident_updates")
        .select("id, org_id, incident_id, message, created_at")
        .eq("incident_id", activeIncident.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<IncidentUpdate>()
    : { data: null };

  const byKey = new Map(PALETTE.map((c) => [c.key, c]));
  // "ics" is handled below as the merged Incident Management tile instead
  // of the generic category-tile loop — see the comment in lib/categories.ts.
  const incidentManagementCategory = CATEGORIES.find((c) => c.key === "ics")!;
  const tiles = [
    ...CATEGORIES.filter((c) => c.key !== "ics" && (!c.requiresAdminTier || org.tier === "admin")).map((c) => ({
      href: `/plan/${code}/categories/${c.key}`,
      label: c.label,
      icon: c.icon,
      color: c.color,
    })),
    {
      href: `/plan/${code}/contacts`,
      label: "Contacts",
      icon: ContactsIcon,
      color: byKey.get("pink")!,
    },
    {
      href: `/plan/${code}/forms`,
      label: "Forms",
      icon: FormsIcon,
      color: byKey.get("green")!,
    },
    {
      href: `/plan/${code}/checklists`,
      label: "Checklists",
      icon: ChecklistIcon,
      color: byKey.get("gold")!,
    },
    ...(org.tier === "admin"
      ? [
          {
            href: `/plan/${code}/incident-management`,
            label: incidentManagementCategory.label,
            icon: incidentManagementCategory.icon,
            color: incidentManagementCategory.color,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PlanHeader title={org.name} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
        {activeIncident && (
          <Link
            href={org.tier === "admin" ? `/plan/${code}/incident-management/status` : `/status/${code}`}
            className="mb-4 block animate-pulse rounded-xl border-2 border-red-500 bg-red-50 p-3 dark:bg-red-950/30"
          >
            <div className="flex items-center gap-2">
              <AlertIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Active incident — {activeIncident.name}
              </p>
            </div>
            {latestUpdate && (
              <p className="mt-1 truncate text-xs text-red-800 dark:text-red-300">{latestUpdate.message}</p>
            )}
          </Link>
        )}

        {pinnedContacts && pinnedContacts.length > 0 && (
          <div className="mb-4 space-y-2">
            {pinnedContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                  {contact.role_title && (
                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{contact.role_title}</p>
                  )}
                </div>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    aria-label={`Call ${contact.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
                  >
                    <PhoneIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center font-semibold text-zinc-800 transition-colors ${tile.color.row} ${tile.color.rowHover}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tile.color.button} ${tile.color.buttonText}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>{tile.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
