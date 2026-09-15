import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact } from "@/lib/supabase/types";
import { PlanHeader } from "../plan-header";
import { ContactsList } from "./contacts-list";

export default async function ContactsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { data: contacts } = await admin
    .from("contacts")
    .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
    .eq("org_id", org.id)
    .order("sort_order")
    .returns<Contact[]>();

  return (
    <div>
      <PlanHeader title="Contacts" backHref={`/plan/${code}`} logoUrl={org.logoUrl} />
      <div className="mx-auto max-w-lg p-4">
        <ContactsList contacts={contacts ?? []} canEdit={org.tier === "admin"} />
      </div>
    </div>
  );
}
