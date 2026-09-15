import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/supabase/types";
import { OrgSettingsPanel } from "./org-settings-panel";

export default async function AdminOverviewPage() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, org_code, logo_path, created_at")
    .eq("id", profile.org_id)
    .single<Organization>();

  if (!org) return null;

  // Getting-started guidance only makes sense before there's anything to
  // manage — once an org has any content the counts below stop being all
  // zero and this section stops rendering on its own, no dismiss state to
  // track.
  const [{ count: sectionCount }, { count: contactCount }, { count: formCount }, { count: checklistCount }] =
    await Promise.all([
      supabase.from("plan_sections").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase.from("forms").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabase.from("checklists").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    ]);

  const isEmpty = !sectionCount && !contactCount && !formCount && !checklistCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Overview</h2>
        <p className="text-sm text-zinc-500">
          Staff open the app (or install it to their home screen) and enter your plan code below
          to view what you publish here.
        </p>
      </div>

      {isEmpty && <GettingStarted orgCode={org.org_code} />}

      <OrgSettingsPanel org={org} />
    </div>
  );
}

function GettingStarted({ orgCode }: { orgCode: string }) {
  const steps = [
    {
      href: "/admin/plan",
      title: "Add your plan content",
      body: "Create a section (e.g. a procedure or reference topic), assign it a category and color, then add one or more pages of content.",
    },
    {
      href: "/admin/contacts",
      title: "Add key contacts",
      body: "Add the people staff need to reach fast. Pin your most urgent one (e.g. Administrator on Call) to feature it on the home screen.",
    },
    {
      href: "/admin/checklists",
      title: "Add a checklist (optional)",
      body: "For step-by-step procedures staff check off during an event — role checklists, activation checklists, etc.",
    },
    {
      href: "/admin/forms",
      title: "Add a fillable form (optional)",
      body: "Staff fill these in on their device and email the result — no submissions are stored here.",
    },
  ];

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Getting started</h3>
      <p className="mb-4 text-sm text-zinc-500">
        Your plan is empty so far. Staff who enter your plan code (
        <span className="font-medium text-black dark:text-zinc-50">{orgCode}</span>) won&apos;t see
        anything until you publish some content below.
      </p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.href} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {i + 1}
            </span>
            <div>
              <Link href={step.href} className="text-sm font-medium text-black underline dark:text-zinc-50">
                {step.title}
              </Link>
              <p className="text-sm text-zinc-500">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
