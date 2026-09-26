import Link from "next/link";
import { lookupOrgByCode } from "@/lib/eop-org";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Incident, IncidentUpdate } from "@/lib/supabase/types";
import { Markdown } from "@/components/markdown";
import { ClientTime } from "@/components/client-time";
import { AlertIcon, ClipboardIcon, ChevronRightIcon } from "@/components/icons";
import { AutoRefresh } from "./auto-refresh";
import { BackButton } from "./back-button";

// Plan pages that supply the "Picking up your child" section, most preferred first (matched
// case-insensitively). See where they are used below.
const PICKUP_PAGE_TITLES = ["Family Pick-Up Information", "Meeting Locations"];

// Public, no-login, no-plan-code-gate page — deliberately outside the
// staff /plan/[code] session-cookie flow (see src/lib/eop-org.ts). The
// org_code is already the same "not secret, share it" identifier used at
// the staff front door (README), so reusing it here — with zero extra
// friction — is a fit for the audience: a parent who needs pick-up info or
// live status *now*, not someone who should have to enter a password.
export default async function StatusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await lookupOrgByCode(code);

  if (!org || !org.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 text-center dark:bg-black">
        <p className="text-sm text-zinc-500">Code not found. Double-check the link with your school.</p>
      </div>
    );
  }

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

  // The pick-up information families see. Prefer a page an administrator wrote FOR families, titled
  // "Family Pick-Up Information"; fall back to the staff "Meeting Locations" page so existing plans keep
  // working. Either way this page is PUBLIC (no login), so it must contain nothing staff-only. The staff
  // "Meeting Locations" page is written for staff ("bring classroom emergency bags…"), which is why a
  // dedicated family page is better.
  const { data: pickupCandidates } = await admin
    .from("plan_pages")
    .select("title, body")
    .eq("org_id", org.id)
    .or(PICKUP_PAGE_TITLES.map((t) => `title.ilike.${t}`).join(","))
    .returns<{ title: string; body: string }[]>();
  const pickupPage = PICKUP_PAGE_TITLES.map((t) => pickupCandidates?.find((p) => p.title.trim().toLowerCase() === t.toLowerCase())).find(Boolean);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <AutoRefresh />

      <header className="bg-[#0b2545] px-4 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <BackButton />
          {org.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" />
          )}
          <h1 className="truncate text-lg font-semibold">{org.name}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <section
          className={`rounded-xl border-2 p-4 ${
            activeIncident
              ? "border-red-400 bg-red-50 dark:bg-red-950/30"
              : "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
          }`}
        >
          {activeIncident ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <AlertIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Active incident — updates below
                </h2>
              </div>
              {!updates || updates.length === 0 ? (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  An incident has been declared. Check back here for updates.
                </p>
              ) : (
                <ul className="space-y-3">
                  {updates.map((u) => (
                    <li key={u.id} className="text-sm">
                      <p className="text-xs text-zinc-500">
                        <ClientTime iso={u.created_at} />
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-50">{u.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              There is no active incident at this time.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">Picking up your child</h2>
          {pickupPage?.body ? (
            <Markdown>{pickupPage.body}</Markdown>
          ) : (
            <p className="text-sm text-zinc-500">
              Contact the school directly for pick-up location information.
            </p>
          )}
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Please bring a government-issued photo ID. Staff will verify your identity before
            releasing your child.
          </p>
        </section>

        <Link
          href={`/status/${code}/glossary`}
          className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <ClipboardIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">What the Alerts Mean</span>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-zinc-400" />
        </Link>

        <p className="text-center text-xs text-zinc-400">This page refreshes automatically.</p>
      </div>
    </div>
  );
}
