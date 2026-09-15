import Link from "next/link";
import { BRAND } from "@/lib/palette";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} px-4 py-5 text-white`}>
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Campus Ready
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Last updated September 2026</p>

          <p>
            Campus Ready is operated by Emergency Preparedness Solutions, LLC (&quot;we,&quot; &quot;us&quot;). This
            policy describes what information Campus Ready collects, why, and how it&apos;s used when your
            organization uses the service.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">What we collect</h2>
            <p>
              <strong>Admin accounts.</strong> If you create or manage a plan, we collect the name, email
              address, and password you provide to sign in. Passwords are handled by our authentication
              provider (Supabase) and are never visible to us in plain text.
            </p>
            <p>
              <strong>Field staff access.</strong> Viewing your organization&apos;s plan doesn&apos;t require
              an account. Staff enter your organization&apos;s plan code (and password, if your organization
              sets one), which issues a signed access cookie scoped only to your organization&apos;s plan. We
              don&apos;t collect a name, email, or any other personal information just to view a plan.
            </p>
            <p>
              <strong>Plan content.</strong> Everything your organization&apos;s admins add — plan sections,
              contacts, forms, and checklists — is stored on your organization&apos;s behalf and is never
              shared with or visible to any other organization using Campus Ready.
            </p>
            <p>
              <strong>Form submissions.</strong> When someone fills out a form your organization has built
              (for example, an Incident Report), their responses are stored and associated with your
              organization so the submission isn&apos;t lost if the follow-up email doesn&apos;t go through.
              These responses aren&apos;t tied to a personal account.
            </p>
            <p>
              <strong>Checklist activity.</strong> When someone checks an item off a checklist, we record
              the item, the timestamp, and — only if they choose to type one in — a free-text name. This
              activity is used to help your organization reconstruct a timeline after an incident.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">How we use it</h2>
            <p>
              We use this information solely to operate Campus Ready for your organization: authenticating
              admins, granting staff access to the right plan, storing the content you author, and
              recording form and checklist activity so your organization can review it later. We don&apos;t
              sell personal information, and we don&apos;t use your organization&apos;s content for
              advertising or share it with any other customer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Where data is stored</h2>
            <p>
              Data is stored with our infrastructure provider (Supabase, hosted on cloud infrastructure in
              the United States) and is not knowingly transferred outside standard cloud-hosting
              operations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Your choices</h2>
            <p>
              An organization&apos;s admin can edit or remove plan content, contacts, and forms at any time
              through the admin panel. To request deletion of an admin account or ask questions about this
              policy, contact us at{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org" className="underline">
                Admin@emergencyprepsolutions.org
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Changes to this policy</h2>
            <p>
              We may update this policy as Campus Ready changes. We&apos;ll update the date at the top of this
              page when we do.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
