import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedOrg } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EopForm } from "@/lib/supabase/types";
import { colorForIndex } from "@/lib/palette";
import { ChevronRightIcon } from "@/components/icons";
import { PlanHeader } from "../plan-header";

export default async function FormsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await getVerifiedOrg(code);
  if (!org) redirect(`/plan/${code}`);

  const admin = createAdminClient();
  const { data: forms } = await admin
    .from("forms")
    .select("id, org_id, title, description, recipient_email, fields, sort_order, created_at")
    .eq("org_id", org.id)
    .order("sort_order")
    .returns<EopForm[]>();

  return (
    <div>
      <PlanHeader title="Forms" backHref={`/plan/${code}`} logoUrl={org.logoUrl} />

      <div className="mx-auto max-w-lg p-4">
        {forms && forms.length > 0 ? (
          <div className="space-y-2">
            {forms.map((form, index) => {
              const color = colorForIndex(index);
              return (
                <Link
                  key={form.id}
                  href={`/plan/${code}/forms/${form.id}`}
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium text-zinc-800 transition-colors ${color.row} ${color.rowHover}`}
                >
                  <span>
                    <span className="block">{form.title}</span>
                    {form.description && (
                      <span className="block text-xs font-normal text-zinc-600">{form.description}</span>
                    )}
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.button} ${color.buttonText}`}>
                    <ChevronRightIcon className="h-5 w-5" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-center text-sm text-zinc-500">No forms yet.</p>
        )}
      </div>
    </div>
  );
}
