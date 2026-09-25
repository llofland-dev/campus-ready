import Link from "next/link";
import { BRAND } from "@/lib/palette";

const h2 = "text-base font-semibold text-black dark:text-zinc-50";
const ul = "list-disc space-y-1.5 pl-5";

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
          <p className="text-xs uppercase tracking-wide text-zinc-400">Last updated September 25, 2026</p>

          <p>
            Campus Ready is operated by Emergency Preparedness Solutions, LLC (&quot;we,&quot; &quot;us&quot;). It
            helps schools and districts (&quot;Schools&quot;) put their emergency operations plan on their
            staff&apos;s phones. This policy explains what information the service handles, what we do with it, and
            how it relates to student privacy laws such as FERPA. It covers the Campus Ready app, its admin area, and
            the public family status page.
          </p>

          <div className="space-y-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <h2 className={h2}>At a glance</h2>
            <ul className={ul}>
              <li>
                Campus Ready is built for emergency plans, not student records. It works without student names, ID
                numbers, grades, or health information, and Schools should keep that kind of information out of it.
              </li>
              <li>School staff don&apos;t need an account to read a plan. Only School administrators have logins.</li>
              <li>We don&apos;t sell personal information, show ads, or use analytics or tracking tools.</li>
              <li>Each School&apos;s content is kept separate from every other School&apos;s.</li>
            </ul>
          </div>

          <section className="space-y-2">
            <h2 className={h2}>What we collect</h2>
            <ul className={ul}>
              <li>
                <strong>School administrators.</strong> Name, email address, and a password for signing in. Passwords
                are handled by our authentication provider (Supabase) and stored only in hashed form. We create
                administrator accounts after a School signs an agreement; there is no public sign-up.
              </li>
              <li>
                <strong>School staff (no account).</strong> To open a plan, staff enter the School&apos;s plan code and,
                if the School has set one, a password or passphrase, which we store only in hashed form. We
                don&apos;t ask staff for a name or email to view a plan. If a staff member chooses to type a name when
                checking off a checklist item, it is saved with that activity.
              </li>
              <li>
                <strong>Content Schools add.</strong> Plan text, staff contacts (names, job titles, phone numbers,
                and email addresses), forms, checklists, images such as a logo, and incident records: an
                incident&apos;s name and times, the status updates a School posts, and the checklist activity logged
                while it is active.
              </li>
              <li>
                <strong>Form responses.</strong> When someone submits a form a School has built, we store what they
                typed so it isn&apos;t lost if the follow-up email doesn&apos;t send. The School decides what its
                forms ask for. If a form asks about a student (for example, &quot;student involved&quot;), that
                information is stored as part of the School&apos;s records; see Student information and FERPA below.
              </li>
              <li>
                <strong>Families and other visitors.</strong> The public status page doesn&apos;t ask visitors for any
                information and doesn&apos;t set cookies. Like any website, our hosting provider records standard
                request details (such as IP address, browser type, and the page requested) for security and
                troubleshooting.
              </li>
            </ul>
            <p>
              Campus Ready isn&apos;t directed at children and doesn&apos;t knowingly collect personal information from
              children. We don&apos;t collect precise location or use advertising identifiers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Student information and FERPA</h2>
            <p>
              Campus Ready holds a School&apos;s emergency plan: procedures, contact lists, checklists, and
              reunification steps. It does not need student records to work, and we ask Schools to keep student names,
              ID numbers, discipline, health, and disability information out of plan text, contacts, checklists, and
              incident updates. Lists such as authorized pick-up persons or individual support plans are best kept in
              the School&apos;s own student-records system and referred to from the plan rather than copied in.
            </p>
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Never post student names or identifying details on the public status page or in incident updates.
              Anyone with the School&apos;s plan code or link can read that page, and it is not protected by a login.
            </div>
            <p>
              Some forms or notes may still include information about students. That information belongs to the School,
              and the School, not Campus Ready, decides whether entering it is appropriate under the Family Educational
              Rights and Privacy Act (FERPA, 20 U.S.C. § 1232g; 34 C.F.R. Part 99) and any other law that applies to it.
            </p>
            <p>
              If a School enters personally identifiable information from education records, we handle it as a service
              provider acting as a &quot;school official&quot; with a legitimate educational interest under 34 C.F.R. §
              99.31(a)(1)(i)(B). That means we:
            </p>
            <ul className={ul}>
              <li>use it only to provide Campus Ready to that School;</li>
              <li>act under the School&apos;s direct control with respect to its use and maintenance;</li>
              <li>
                don&apos;t disclose it to anyone else, except the service providers listed below who act for us, as the
                School directs, or as the law requires;
              </li>
              <li>don&apos;t sell it or use it for advertising, marketing, or profiling; and</li>
              <li>return or delete it at the School&apos;s request or when the agreement ends.</li>
            </ul>
            <p>
              Other laws may also apply, for example state student-privacy laws, HIPAA for Schools that are part of a
              health-care organization or provide health services, and special-education rules. A School with those
              needs should talk to us before entering such information so we can agree on the right terms in writing.
            </p>
            <p>
              Parents, guardians, and eligible students who want to see or correct a student&apos;s records should
              contact the School, which controls those records. If we receive such a request, we will refer it to the
              School instead of responding ourselves.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>How we use information</h2>
            <p>
              We use information only to run Campus Ready for the School: signing administrators in, giving staff
              access to the right plan, storing and showing the content the School authors, recording form and
              checklist activity so the School can review an incident later, keeping the service secure, and
              providing support the School asks for. We don&apos;t sell personal information, use it for advertising
              or profiling, or share one School&apos;s content with any other customer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Who we share it with</h2>
            <p>Only the service providers we need to operate Campus Ready, and only to do that:</p>
            <ul className={ul}>
              <li>
                <strong>Supabase</strong>: database, sign-in, and file storage, hosted in the United States.
              </li>
              <li>
                <strong>Vercel</strong>: web hosting and request logs, in the United States.
              </li>
            </ul>
            <p>
              We may also disclose information if the law requires it or to protect people&apos;s safety or the
              service. The email-report and form features open your own device&apos;s email app; we don&apos;t send,
              receive, or see those emails.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>What is stored on a device</h2>
            <ul className={ul}>
              <li>
                <strong>Access cookie.</strong> After staff enter a plan code, a signed cookie keeps them signed in to
                that plan for up to 30 days. Administrators&apos; sign-in also uses cookies from our authentication
                provider. These are needed for the service to work.
              </li>
              <li>
                <strong>Offline copy.</strong> So a plan still works without a connection, the app saves its pages on
                the device. Checklist progress and any name a staff member typed are kept in the browser&apos;s local
                storage.
              </li>
              <li>
                <strong>Removing it.</strong> &quot;Sign out of this plan&quot; on the plan home screen removes the
                access cookie and the saved offline copy from that device. Staff should use it on shared or personal
                devices when they no longer need access.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Security</h2>
            <p>
              Data is encrypted in transit (HTTPS). Each School&apos;s data is kept separate from every other
              School&apos;s, enforced in the database and on the server. Plan and administrator passwords are stored
              hashed. Access to our systems is limited to authorized people who need it to operate the service. No
              system is perfectly secure. If we learn that a School&apos;s information was accessed without
              authorization, we will notify that School&apos;s administrator without unreasonable delay.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Retention and deletion</h2>
            <p>
              We keep a School&apos;s information while it uses Campus Ready. A School&apos;s administrator can edit or
              delete plan content, contacts, forms, and checklists at any time in the admin area. To delete other
              records (such as form responses or incident logs), an administrator account, or the whole organization,
              contact us and we will do it on the School&apos;s request. When a School&apos;s agreement ends, we will
              give it a reasonable window to export its content and then delete it. Deleted information may remain in
              routine backups for a limited time before it is overwritten.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Questions and requests</h2>
            <p>
              To ask a question about this policy or make a request on behalf of a School, contact us at{" "}
              <a href="mailto:Admin@emergencyprepsolutions.org" className="underline">
                Admin@emergencyprepsolutions.org
              </a>
              . See also our{" "}
              <Link href="/terms" className="underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={h2}>Changes to this policy</h2>
            <p>
              We may update this policy as Campus Ready changes. We will update the date at the top of this page, and
              tell each School&apos;s administrator about material changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
