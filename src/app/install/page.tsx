import Link from "next/link";
import { BRAND } from "@/lib/palette";
import { QrCode } from "@/components/qr-code";
import { InstallFlow } from "./install-flow";

export const metadata = { title: "Install — Campus Ready" };

// The address this page is shared at. The QR code points here, so a poster or email works on any phone
// without typing. (The custom domain is the long-term address; the older campus-ready.vercel.app one may
// start redirecting to it.)
const INSTALL_URL = "https://campusready.emergencyprepsolutions.org/install";

const h2 = "text-base font-semibold text-black dark:text-zinc-50";
const card = "space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";
const ol = "list-decimal space-y-2 pl-5";

// The page itself is only the frame and the plain-text instructions (which stay in the page for anyone without
// JavaScript, and in the offline copy). InstallFlow works out which device this is and puts the right button or
// steps at the top — see install-flow.tsx.
export default function InstallPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} safe-top-5 px-4 py-5 text-white`}>
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Campus Ready
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Install Campus Ready</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            Campus Ready works like an app, but there is nothing to download from an app store. Add it to your
            home screen once — it takes about 30 seconds — and your school&apos;s emergency plan opens with one tap,
            even when you have no signal.
          </p>

          <noscript>
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
              Turn on JavaScript in your browser to get an install button. The steps for every device are listed at
              the bottom of this page.
            </p>
          </noscript>

          <InstallFlow
            installUrl={INSTALL_URL}
            qr={
              <QrCode
                value={INSTALL_URL}
                label="QR code for the Campus Ready install page"
                className="mx-auto h-44 w-44 shrink-0 rounded-md sm:mx-0"
              />
            }
            afterInstall={
              <>
                <section className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-200">
                  <p>
                    <strong>Do this while you have Wi-Fi or cell service.</strong> After you open your plan, wait until
                    the line under <strong>Access level</strong> says <strong>Ready offline</strong>. It first says
                    &quot;Saving for offline use…&quot; and usually finishes in under a minute. That is your signal that a
                    copy of the plan is saved on your phone.
                  </p>
                </section>

                <section className={card}>
                  <h2 className={h2}>Then open your plan</h2>
                  <ol className={ol}>
                    <li>
                      Tap the <strong>Campus Ready</strong> icon, then <strong>Get Started</strong>, then{" "}
                      <strong>View My Plan</strong>.
                    </li>
                    <li>
                      Type the <strong>plan code</strong> your school gave you and tap <strong>Continue</strong>. If your
                      school set a password, enter it too.
                    </li>
                    <li>
                      Stay connected until the line under <strong>Access level</strong> says <strong>Ready offline</strong>.
                      If it says it couldn&apos;t save, tap <strong>Try again</strong>.
                    </li>
                  </ol>
                </section>
              </>
            }
            reference={
              <>
                <section className={card}>
                  <h2 className={h2}>iPhone or iPad</h2>
                  <ol className={ol}>
                    <li>
                      Open this page in <strong>Safari</strong>. Links opened inside Gmail, Facebook, Teams or a text
                      message can&apos;t be added to the home screen — tap the compass or &quot;Open in Safari&quot; first.
                    </li>
                    <li>
                      Tap the <strong>Share</strong> button (a square with an arrow pointing up) at the bottom of the screen.
                    </li>
                    <li>
                      Tap <strong>Add to Home Screen</strong>. If you don&apos;t see it, scroll down or look under{" "}
                      <strong>More</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong>. The Campus Ready icon now appears on your home screen.
                    </li>
                  </ol>
                </section>

                <section className={card}>
                  <h2 className={h2}>Android phone or tablet</h2>
                  <ol className={ol}>
                    <li>
                      Open this page in <strong>Chrome</strong>.
                    </li>
                    <li>
                      Tap the <strong>Install Campus Ready</strong> button at the top of this page — or, if there isn&apos;t
                      one, tap the <strong>⋮</strong> menu in the top-right corner.
                    </li>
                    <li>
                      Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>), then tap{" "}
                      <strong>Install</strong>.
                    </li>
                  </ol>
                  <p className="text-xs text-zinc-500">
                    Using Samsung Internet? Tap the menu, then <strong>Add page to</strong>, then{" "}
                    <strong>Home screen</strong>.
                  </p>
                </section>

                <section className={card}>
                  <h2 className={h2}>Chromebook or computer (Chrome or Edge)</h2>
                  <ol className={ol}>
                    <li>Open this page in Chrome or Edge.</li>
                    <li>
                      Click the <strong>Install on this computer</strong> button at the top of this page — or click the{" "}
                      <strong>install icon</strong> at the right end of the address bar (a small screen with a down
                      arrow), or open the <strong>⋮</strong> menu and choose <strong>Install Campus Ready</strong>.
                    </li>
                    <li>
                      Click <strong>Install</strong>. It opens in its own window and is added to your app list.
                    </li>
                  </ol>
                </section>

                <section className={card}>
                  <h2 className={h2}>Check that it works with no signal</h2>
                  <ol className={ol}>
                    <li>Turn on airplane mode.</li>
                    <li>
                      Open Campus Ready from its icon and open your plan the same way as above. Your pages, contacts and
                      checklists should open.
                    </li>
                    <li>
                      If something says you&apos;re offline, turn airplane mode off, open your plan, and wait for{" "}
                      <strong>Ready offline</strong> again.
                    </li>
                  </ol>
                  <p className="text-xs text-zinc-500">
                    Each time you open Campus Ready with a connection, it quietly refreshes your saved copy, so you
                    always have the latest version your school published.
                  </p>
                </section>
              </>
            }
          />

          <p className="text-xs text-zinc-500">
            Campus Ready does not send alerts and is not a 911 service — in an emergency, call 911 first. Questions?
            See{" "}
            <Link href="/support" className="underline">
              Support
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
