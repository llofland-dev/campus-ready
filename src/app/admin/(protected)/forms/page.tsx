import { createClient } from "@/lib/supabase/server";
import type { EopForm, Profile } from "@/lib/supabase/types";
import { FormsEditor } from "./forms-editor";

export default async function AdminFormsPage() {
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

  const { data: forms } = await supabase
    .from("forms")
    .select("id, org_id, title, description, recipient_email, fields, sort_order, created_at")
    .eq("org_id", profile.org_id)
    .order("sort_order")
    .returns<EopForm[]>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Forms</h2>
        <p className="text-sm text-zinc-500">
          Staff fill these on-device and send them by email. Every submission is also saved here
          regardless of whether the email step actually reaches anyone&apos;s inbox — see
          Submissions under each form.
        </p>
      </div>

      <FormsEditor orgId={profile.org_id} forms={forms ?? []} />
    </div>
  );
}
