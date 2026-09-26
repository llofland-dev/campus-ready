import Link from "next/link";
import { BRAND } from "@/lib/palette";

export const metadata = { title: "Support — Campus Ready" };

const h2 = "text-base font-semibold text-black dark:text-zinc-50";

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} px-4 py-5 text-white`}>
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Campus Ready
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Support</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p>
              <strong>In an emergency, call 911 first.</strong> Campus Ready is not an emergency alerting or dispatch
              service and is not monitored around the clock — support is by email.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Contact us</h2>
            <p>
              Emergency Preparedness Solutions, LLC —{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org" className="underline">
                Admin@emergencyprepsolutions.org
              </a>
              . We&apos;re glad to help school administrators with setup, questions, or problems. Please don&apos;t
              email student names or other student information — we never need it to help you.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Staff</h2>
            <p>
              <strong>Where do I get my school&apos;s plan code?</strong> Your school&apos;s administrator sets it up
              and shares it with staff. If you don&apos;t have it, ask them — we can&apos;t look it up for you.
            </p>
            <p>
              <strong>Does Campus Ready work without an internet connection?</strong> Yes. After you sign in to your
              plan, stay connected for about a minute so it can save itself to your phone; then your plan&apos;s
              pages, checklists, and contacts open even with no service. Install it on your home screen for the
              fastest access (in your browser&apos;s menu, choose Add to Home Screen).
            </p>
            <p>
              <strong>I forgot the staff password or the Facility Admin passphrase.</strong> Your school&apos;s
              administrator can set a new one from the admin Overview screen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Administrators</h2>
            <p>
              <strong>I forgot my admin password.</strong> On the{" "}
              <Link href="/admin/login" className="underline">
                admin sign-in screen
              </Link>
              , choose &quot;Forgot password?&quot; and we&apos;ll email you a reset link. The link works on any
              device, even if you open the email on a different phone or computer than the one you asked from. If the
              email doesn&apos;t arrive within a few minutes, check your spam or junk folder — some school mail systems
              filter automatic messages — and then contact us.
            </p>
            <p>
              <strong>Can I bring in a Word, Excel, or PDF plan?</strong> Yes. In the admin area, open{" "}
              <strong>Import from Word</strong> — it accepts Word, Excel, and PDF files. You review the draft before
              anything is published.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Families</h2>
            <p>
              <strong>I&apos;m a parent or guardian. What is this?</strong> Your child&apos;s school uses Campus Ready
              to keep its emergency plan on staff phones. We can&apos;t answer questions about your child, your
              school&apos;s procedures, or an event in progress — please contact the school. If the school shared a
              status link with you, that page shows the school&apos;s own updates during an incident.
            </p>
          </section>

          <section id="delete-account" className="space-y-2">
            <h2 className={h2}>Deleting your school&apos;s data</h2>
            <p>
              Administrators can delete their own account at any time: sign in at{" "}
              <Link href="/admin/login" className="underline">
                Admin Sign In
              </Link>
              , scroll to the bottom of any admin screen, and choose <strong>Delete account</strong>. If you&apos;re
              your school&apos;s only administrator, this also permanently deletes the school&apos;s plan and all of its
              content — sections, contacts, forms, checklists, saved form responses, and incident logs — and it cannot
              be undone. If you&apos;re unsure, email us first.
            </p>
            <p>
              You can also ask us to delete data or an account by emailing{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org?subject=Deletion%20request" className="underline">
                Admin@emergencyprepsolutions.org
              </a>{" "}
              from the administrator&apos;s address. When a school&apos;s agreement ends, we give it a reasonable
              window to export its content and then delete it, as described in our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              . Staff who only view a plan don&apos;t have accounts, so there is nothing personal to delete for them.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
