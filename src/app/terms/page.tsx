import Link from "next/link";
import { BRAND } from "@/lib/palette";

const h2 = "text-base font-semibold text-black dark:text-zinc-50";

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
          <p className="text-xs uppercase tracking-wide text-zinc-400">Last updated September 25, 2026</p>

          <p>
            These terms govern use of Campus Ready, provided by Emergency Preparedness Solutions, LLC (&quot;we,&quot;
            &quot;us&quot;), by a school or district (&quot;School&quot;) and by the administrators, staff, and others
            who use Campus Ready under that School&apos;s plan. By using Campus Ready, you agree to these terms, and if
            you use it for a School you confirm you are authorized to do so. If a School and we have signed a separate
            agreement, that agreement controls wherever it differs from these terms.
          </p>

          <section className="space-y-2">
            <h2 className={h2}>The service</h2>
            <p>
              Campus Ready lets a School distribute its emergency operations plan (sections, contacts, forms,
              checklists, and reunification steps) to staff on mobile and web, including offline access to previously
              viewed content, and lets authorized staff log an incident and post status updates to a public page for
              families. The School is responsible for the accuracy of the plan content it enters; we don&apos;t author,
              review, or verify it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Not an emergency service</h2>
            <p>
              Campus Ready is not an emergency alerting, dispatch, or 911 service. It does not send push, text, or
              phone notifications, and it is not monitored around the clock. In an emergency, call 911 first and follow
              your School&apos;s procedures. The public status page shows only what a School has posted, and it depends
              on internet access and third-party infrastructure; anyone without a connection may see saved or
              out-of-date information.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Accounts and access</h2>
            <p>
              We create administrator accounts for a School. The School&apos;s administrators are responsible for their
              sign-in credentials, for deciding who receives the plan code and any password or Facility Admin
              passphrase, and for changing those when someone leaves. A plan code is not a secret on its own, so use
              the optional passwords for anything sensitive. Tell us promptly if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Student information and FERPA</h2>
            <p>
              Campus Ready is designed for emergency plans, not student records. The School decides what it enters and
              is responsible for having the legal authority to enter it, including under the Family Educational Rights
              and Privacy Act (FERPA) and any other state or federal law that applies to it. Keep student education
              records and student-identifying details out of the plan, contacts, checklists, and incident updates unless
              the School has decided it needs them there, and never put them on the public status page. Where a School
              does enter personally identifiable information from education records, we handle it as described in our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              . A School that needs a written data-protection addendum, or that handles health information or other
              specially regulated data, should contact us before entering it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Fees and billing</h2>
            <p>
              Fees are set out in your organization&apos;s order or invoice. Unless otherwise agreed, subscriptions are
              billed annually and invoiced with net-30 payment terms. If an invoice becomes seriously past due, we may
              suspend your organization&apos;s access to Campus Ready until payment is received. Suspension pauses
              access; it does not delete your organization&apos;s content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Your content</h2>
            <p>
              Your organization owns the content it enters into Campus Ready. You give us permission to host, process,
              and display it as needed to provide the service to your organization&apos;s staff; we don&apos;t use it
              for any other purpose or share it with any other customer. You&apos;re responsible for making sure you
              have the right to use any content (text, images, or documents) you upload.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Acceptable use</h2>
            <p>
              Don&apos;t use Campus Ready to store or distribute content unrelated to your organization&apos;s
              emergency planning; post personally identifiable student information or other sensitive personal
              information on the public status page; attempt to access another organization&apos;s plan without
              authorization; probe or test the service&apos;s security without our written permission; or interfere
              with the service&apos;s normal operation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Availability and disclaimers</h2>
            <p>
              We work to keep Campus Ready available and accurate, but it&apos;s provided &quot;as is,&quot; without
              warranties of any kind. Offline copies reflect the last time a device was online and may be out of date.
              Campus Ready is a tool for distributing your organization&apos;s own emergency plan. It doesn&apos;t
              replace your organization&apos;s emergency management judgment, training, or compliance obligations, and
              we&apos;re not liable for decisions made based on plan content your organization authored.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Termination</h2>
            <p>
              Either party may end the subscription at the end of its then-current term by written notice. We may
              suspend or terminate access for non-payment or a material violation of these terms. On termination,
              we&apos;ll provide a reasonable window to export your organization&apos;s content before it&apos;s
              deleted, as described in our Privacy Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Changes to these terms</h2>
            <p>
              We may update these terms as Campus Ready changes. We&apos;ll update the date at the top of this page when
              we do, and material changes will be communicated to your organization&apos;s admin.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org" className="underline">
                Admin@emergencyprepsolutions.org
              </a>
              . See also our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
