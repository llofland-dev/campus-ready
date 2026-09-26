import Link from "next/link";
import { lookupOrgByCode } from "@/lib/eop-org";
import { ChevronLeftIcon } from "@/components/icons";

// Plain-language, org-agnostic — the same words mean the same thing at
// every school using this app, so this is intentionally static rather than
// admin-authored content. Written for a parent reading it cold off a text
// alert, not for staff (see the staff-facing Core Protocols pages for the
// operational version of the same terms).
const TERMS: { term: string; meaning: string }[] = [
  {
    term: "Hold",
    meaning:
      "Stay where you are and stay quiet. Your child's routine continues — this is usually precautionary, such as a minor situation in a hallway.",
  },
  {
    term: "Secure",
    meaning:
      "The school has locked its exterior doors as a precaution against something outside the building. Classes continue as normal inside.",
  },
  {
    term: "Lockdown",
    meaning:
      "The school is responding to a serious situation directly affecting the building. Classroom doors are locked and no one enters or leaves until authorities give the all-clear.",
  },
  {
    term: "Evacuate",
    meaning:
      "Students and staff have moved outside to a safe location away from the building, such as for a fire alarm.",
  },
  {
    term: "Shelter-in-Place",
    meaning:
      "Students and staff have moved to a protected interior space, often for severe weather or a nearby hazard.",
  },
  {
    term: "All Clear",
    meaning: "The situation has ended and normal activities have resumed.",
  },
];

export default async function GlossaryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const org = await lookupOrgByCode(code);

  if (!org || !org.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 text-center dark:bg-black">
        <p className="text-sm text-zinc-500">Code not found. Double-check the link with your school.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="bg-[#0b2545] px-4 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Link href={`/status/${code}`} aria-label="Back" className="-ml-1 shrink-0 rounded-full p-1 hover:bg-white/10">
            <ChevronLeftIcon className="h-6 w-6" />
          </Link>
          <h1 className="truncate text-lg font-semibold">What the Alerts Mean</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 p-4">
        <p className="text-sm text-zinc-500">
          If you receive a text or call mentioning one of these terms, this page explains what it
          means. Check the{" "}
          <Link href={`/status/${code}`} className="underline">
            status page
          </Link>{" "}
          for the latest information about what&apos;s actually happening right now.
        </p>

        {TERMS.map((t) => (
          <section
            key={t.term}
            className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
          >
            <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{t.term}</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{t.meaning}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
