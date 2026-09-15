import Link from "next/link";
import { getVerifiedOrg, lookupOrgByCode } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact } from "@/lib/supabase/types";
import { CATEGORIES } from "@/lib/categories";
import { PALETTE } from "@/lib/palette";
import { ChecklistIcon, ContactsIcon, FormsIcon, PhoneIcon } from "@/components/icons";
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
  const { data: pinnedContacts } = await admin
    .from("contacts")
    .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
    .eq("org_id", org.id)
    .eq("pinned", true)
    .order("sort_order")
    .returns<Contact[]>();

  const byKey = new Map(PALETTE.map((c) => [c.key, c]));
  const tiles = [
    ...CATEGORIES.filter((c) => !c.requiresAdminTier || org.tier === "admin").map((c) => ({
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
  ];

  return (
    <div>
      <PlanHeader title={org.name} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
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
