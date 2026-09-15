import { notFound, redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EopForm } from "@/lib/supabase/types";
import { PlanHeader } from "../../plan-header";
import { FormFiller } from "./form-filler";

export default async function FormPage({
  params,
}: {
  params: Promise<{ code: string; formId: string }>;
}) {
  const { code, formId } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("forms")
    .select("id, org_id, title, description, recipient_email, fields, sort_order, created_at")
    .eq("id", formId)
    .eq("org_id", org.id)
    .maybeSingle<EopForm>();

  if (!form) notFound();

  return (
    <div>
      <PlanHeader title={form.title} backHref={`/plan/${code}/forms`} logoUrl={org.logoUrl} />

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {form.description && <p className="text-sm text-zinc-500">{form.description}</p>}
        <FormFiller form={form} />
      </div>
    </div>
  );
}
