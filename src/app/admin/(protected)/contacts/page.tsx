import { createClient } from "@/lib/supabase/server";
import type { Contact, Profile } from "@/lib/supabase/types";
import { ContactsEditor } from "./contacts-editor";

export default async function AdminContactsPage() {
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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, org_id, name, role_title, phone, email, category, pinned, sort_order, created_at")
    .eq("org_id", profile.org_id)
    .order("sort_order")
    .returns<Contact[]>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Contacts</h2>
        <p className="text-sm text-zinc-500">
          Shown to staff with one-touch dial. Group with a category (e.g. &quot;External
          agencies&quot;) if useful.
        </p>
      </div>

      <ContactsEditor orgId={profile.org_id} contacts={contacts ?? []} />
    </div>
  );
}
