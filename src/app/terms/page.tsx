import Link from "next/link";
import { BRAND } from "@/lib/palette";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} px-4 py-5 text-white`}>
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Campus Ready
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Terms of Service</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Last updated September 2026</p>

          <p>
            These terms govern your organization&apos;s use of Campus Ready, provided by Emergency Preparedness
            Solutions, LLC (&quot;we,&quot; &quot;us&quot;). By creating an organization or otherwise using
            Campus Ready, you agree to these terms on behalf of your organization.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">The service</h2>
            <p>
              Campus Ready lets your organization distribute its emergency operations plan — sections,
              contacts, forms, and checklists — to staff on mobile and web, including offline access to
              previously viewed content. You&apos;re responsible for the accuracy of the plan content your
              organization enters; we don&apos;t author, review, or verify it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Fees and billing</h2>
            <p>
              Fees are set out in your organization&apos;s order or invoice. Unless otherwise agreed,
              subscriptions are billed annually and invoiced with net-30 payment terms. If an invoice
              becomes seriously past due, we may suspend your organization&apos;s access to Campus Ready until
              payment is received. Suspension pauses access — it does not delete your organization&apos;s
              content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Your content</h2>
            <p>
              Your organization owns the content it enters into Campus Ready. We store and display it back to
              your organization&apos;s staff, and don&apos;t use it for any other purpose or share it with
              any other customer. You&apos;re responsible for making sure you have the right to use any
              content (text, images, or documents) you upload.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Acceptable use</h2>
            <p>
              Don&apos;t use Campus Ready to store or distribute content unrelated to your organization&apos;s
              emergency planning, attempt to access another organization&apos;s plan without authorization,
              or interfere with the service&apos;s normal operation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">
              Availability and disclaimers
            </h2>
            <p>
              We work to keep Campus Ready available and accurate, but it&apos;s provided &quot;as is,&quot;
              without warranties of any kind. Campus Ready is a tool for distributing your organization&apos;s
              own emergency plan — it doesn&apos;t replace your organization&apos;s emergency management
              judgment, training, or compliance obligations, and we&apos;re not liable for decisions made
              based on plan content your organization authored.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Termination</h2>
            <p>
              Either party may end the subscription at the end of its then-current term by written notice.
              We may suspend or terminate access for non-payment or a material violation of these terms.
              On termination, we&apos;ll provide a reasonable window to export your organization&apos;s
              content before it&apos;s deleted.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Changes to these terms</h2>
            <p>
              We may update these terms as Campus Ready changes. We&apos;ll update the date at the top of this
              page when we do, and material changes will be communicated to your organization&apos;s admin.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-black dark:text-zinc-50">Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org" className="underline">
                Admin@emergencyprepsolutions.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
