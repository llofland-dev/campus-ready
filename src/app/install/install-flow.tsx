"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { BRAND } from "@/lib/palette";
import { useClientValue } from "@/lib/use-client-value";
import { detectDevice } from "@/lib/install-device";
import { getInstallEvent, getInstalled, runInstallPrompt, subscribeInstallState } from "@/lib/install-prompt";

// What the install page shows for THIS device. Android and computers (Chrome, Edge, Samsung Internet) can be
// offered a real one-tap install button. iPhone and iPad have no such thing — Apple only allows adding a web app
// through Safari's Share menu — so there the page shows just those steps, with pictures of what to tap. Inside
// another app's built-in browser (Facebook, Gmail, a QR scanner's viewer) nothing can be installed at all, so the
// page says so and helps move the link to the real browser.
//
// Preview any of these on a computer by adding ?view=ios, android, desktop, inapp-ios, inapp-android, installed
// or prompt to the address.
type View =
  | "checking"
  | "installed"
  | "done"
  | "inapp-ios"
  | "inapp-android"
  | "ios"
  | "prompt"
  | "manual-android"
  | "manual-desktop";

const card = "space-y-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950";
const h2 = "text-lg font-semibold text-black dark:text-zinc-50";
const muted = "text-sm text-zinc-600 dark:text-zinc-400";
const bigButton = `w-full rounded-full px-6 py-4 text-center text-lg font-semibold text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`;
const smallButton =
  "rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100";

// ---- little pictures of the things to look for, drawn the way the phone draws them --------------------------
const glyph = "h-7 w-7 stroke-current fill-none";
function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={glyph} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
function AddGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={glyph} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function DotsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={glyph} aria-hidden>
      <circle cx="12" cy="5" r="1.8" className="fill-current stroke-none" />
      <circle cx="12" cy="12" r="1.8" className="fill-current stroke-none" />
      <circle cx="12" cy="19" r="1.8" className="fill-current stroke-none" />
    </svg>
  );
}
function MonitorGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={glyph} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 7v5M10 10l2 2 2-2M8 20h8M12 16v4" />
    </svg>
  );
}
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 stroke-current fill-none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 12.5l3 3 6-6.5" />
    </svg>
  );
}

function Step({ n, title, icon, children }: { n: number; title: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${BRAND.button}`}>{n}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-black dark:text-zinc-50">{title}</p>
        {children && <div className={muted}>{children}</div>}
      </div>
      {icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-sky-600 dark:border-white/10 dark:bg-zinc-950 dark:text-sky-400">
          {icon}
        </span>
      )}
    </li>
  );
}

const BROWSER_NAMES: Record<string, string> = { chrome: "Chrome", edge: "Edge", firefox: "Firefox", samsung: "Samsung Internet", safari: "Safari" };

export function InstallFlow({
  installUrl,
  qr,
  afterInstall,
  reference,
}: {
  installUrl: string;
  qr: ReactNode;
  afterInstall: ReactNode;
  reference: ReactNode;
}) {
  // Read from the browser without upsetting the server-rendered markup (see use-client-value.ts).
  const deviceKey = useClientValue(() => {
    const d = detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    return `${d.platform}:${d.browser}:${d.inApp ? 1 : 0}`;
  }, "");
  const previewKey = useClientValue(() => new URLSearchParams(window.location.search).get("view") ?? "", "");
  const canShare = useClientValue(() => typeof navigator.share === "function", false);
  const installedNow = useSyncExternalStore(subscribeInstallState, getInstalled, () => false);
  const offer = useSyncExternalStore(subscribeInstallState, getInstallEvent, () => null);

  const [outcome, setOutcome] = useState<"idle" | "accepted" | "dismissed" | "unavailable">("idle");
  const [waited, setWaited] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chrome announces "this can be installed" a moment after the page loads. If nothing has come by then, show the
  // manual steps instead of leaving the person waiting.
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  // ---- which situation is this? ---------------------------------------------------------------------------
  const [detectedPlatform, detectedBrowser, inAppFlag] = deviceKey ? deviceKey.split(":") : ["", "", "0"];
  let platform = detectedPlatform;
  let browser = detectedBrowser;
  let inApp = inAppFlag === "1";
  let installed = installedNow;
  let hasOffer = offer !== null;
  const previewing = deviceKey !== "" && previewKey !== "";
  if (previewing) {
    installed = previewKey === "installed";
    inApp = previewKey.startsWith("inapp");
    hasOffer = previewKey === "prompt";
    if (previewKey === "ios" || previewKey === "inapp-ios") [platform, browser] = ["ios", "safari"];
    else if (previewKey === "android" || previewKey === "inapp-android") [platform, browser] = ["android", "chrome"];
    else if (previewKey === "desktop" || previewKey === "prompt") [platform, browser] = ["desktop", "chrome"];
  }
  const isPhone = platform === "ios" || platform === "android";

  let view: View;
  if (outcome === "accepted") view = "done";
  else if (!deviceKey) view = "checking";
  else if (installed) view = "installed";
  else if (inApp) view = platform === "ios" ? "inapp-ios" : "inapp-android";
  else if (platform === "ios") view = "ios";
  else if (hasOffer) view = "prompt";
  else if (!waited && !previewing) view = "checking";
  else view = platform === "android" ? "manual-android" : "manual-desktop";

  async function install() {
    if (!offer) {
      setOutcome("unavailable");
      return;
    }
    setOutcome(await runInstallPrompt(offer));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the address is printed on the page below, ready to select.
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: "Install Campus Ready", url: installUrl });
    } catch {
      // Cancelled — nothing to do.
    }
  }

  const copyButton = (
    <button type="button" onClick={copyLink} className={smallButton}>
      {copied ? "Link copied ✓" : "Copy the link"}
    </button>
  );

  // ---- the main card -------------------------------------------------------------------------------------
  let primary: ReactNode;
  if (view === "checking") {
    primary = (
      <div className={card}>
        <h2 className={h2}>Getting your install options ready…</h2>
        <p className={muted}>One moment. The steps below work on any device if this takes too long.</p>
      </div>
    );
  } else if (view === "installed" || view === "done") {
    primary = (
      <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-center gap-3">
          <CheckGlyph />
          <h2 className="text-lg font-semibold">{view === "done" ? "Campus Ready is installed" : "Campus Ready is already installed"}</h2>
        </div>
        <p className="text-sm">
          {view === "done"
            ? "Look for the Campus Ready icon on your home screen or in your app list, and open it from there from now on."
            : "You're using the installed app. Nothing more to set up here — open your plan and check that it says Ready offline."}
        </p>
      </div>
    );
  } else if (view === "prompt") {
    primary = (
      <div className={card}>
        <h2 className={h2}>Install Campus Ready</h2>
        <p className={muted}>
          {isPhone
            ? "One tap adds it to your home screen. No app store, no cost."
            : "One click adds it to this computer's app list, in its own window. No app store, no cost."}
        </p>
        <button type="button" onClick={install} className={bigButton}>
          {isPhone ? "Install Campus Ready" : "Install on this computer"}
        </button>
        {outcome === "dismissed" && <p className={muted}>No problem — tap the button when you are ready.</p>}
      </div>
    );
  } else if (view === "ios") {
    primary = (
      <div className={card}>
        <h2 className={h2}>Add Campus Ready to your Home Screen</h2>
        <p className={muted}>
          Apple doesn&apos;t allow a one-tap install button, so it takes three taps in Safari. It&apos;s quick.
        </p>
        <ol className="space-y-2">
          <Step
            n={1}
            title="Tap the Share button"
            icon={<ShareGlyph />}
          >
            A square with an arrow pointing up, in Safari&apos;s toolbar — at the bottom on an iPhone, top right on an
            iPad.
          </Step>
          <Step n={2} title="Scroll down and tap “Add to Home Screen”" icon={<AddGlyph />}>
            If you can&apos;t see it, tap <strong>More</strong> at the bottom of the list.
          </Step>
          <Step n={3} title="Tap “Add”">
            In the top-right corner. The Campus Ready icon now appears on your home screen.
          </Step>
        </ol>
        {browser !== "safari" && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
            You&apos;re using {BROWSER_NAMES[browser] ?? "another browser"}. If you can&apos;t find those buttons, open this page
            in <strong>Safari</strong> instead. {copyButton}
          </p>
        )}
      </div>
    );
  } else if (view === "inapp-ios" || view === "inapp-android") {
    primary = (
      <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
        <h2 className="text-lg font-semibold">Open this page in your browser first</h2>
        <p className="text-sm">
          You&apos;re looking at this page inside another app (an email, a message or a social app). Campus Ready
          can&apos;t be installed from there — it needs {view === "inapp-ios" ? "Safari" : "Chrome"}.
        </p>
        <ol className="space-y-2 text-sm">
          <li>
            <strong>1.</strong> Tap the <strong>⋯</strong> or <strong>Share</strong> button on this screen.
          </li>
          <li>
            <strong>2.</strong> Choose <strong>Open in {view === "inapp-ios" ? "Safari" : "Chrome"}</strong> (it may say
            &quot;Open in browser&quot;).
          </li>
        </ol>
        <p className="text-sm">
          Can&apos;t find it? Copy the link, open {view === "inapp-ios" ? "Safari" : "Chrome"}, and paste it into the
          address bar. {copyButton}
        </p>
      </div>
    );
  } else if (view === "manual-android") {
    primary = (
      <div className={card}>
        <h2 className={h2}>Add Campus Ready to your home screen</h2>
        <p className={muted}>
          {outcome === "dismissed"
            ? "No problem. When you are ready, here is how to add it by hand:"
            : "Your browser didn't offer a one-tap button, so use its menu:"}
        </p>
        <ol className="space-y-2">
          {browser === "samsung" ? (
            <>
              <Step n={1} title="Tap the menu (≡) at the bottom right" icon={<DotsGlyph />} />
              <Step n={2} title="Tap “Add page to”, then “Home screen”" />
            </>
          ) : (
            <>
              <Step n={1} title="Tap the ⋮ menu in the top-right corner" icon={<DotsGlyph />} />
              <Step n={2} title="Tap “Install app” (or “Add to Home screen”)">
                Then tap <strong>Install</strong>.
              </Step>
            </>
          )}
        </ol>
        {(browser === "firefox" || browser === "other") && (
          <p className={muted}>Don&apos;t see it? Open this page in Chrome and try again. {copyButton}</p>
        )}
      </div>
    );
  } else {
    primary = (
      <div className={card}>
        <h2 className={h2}>Install Campus Ready on this computer</h2>
        {browser === "chrome" || browser === "edge" ? (
          <>
            <p className={muted}>
              {outcome === "dismissed" ? "No problem. When you are ready:" : "Your browser can install it as an app:"}
            </p>
            <ol className="space-y-2">
              <Step n={1} title="Click the install icon at the right end of the address bar" icon={<MonitorGlyph />}>
                A small screen with a down arrow. Or open the <strong>⋮</strong> menu and choose{" "}
                <strong>Install Campus Ready</strong>.
              </Step>
              <Step n={2} title="Click “Install”">
                It opens in its own window and is added to your app list.
              </Step>
            </ol>
          </>
        ) : browser === "safari" ? (
          <p className={muted}>
            In Safari on a Mac, choose <strong>File → Add to Dock</strong>. To install it on a phone instead, scan the
            code below with the phone&apos;s camera.
          </p>
        ) : (
          <p className={muted}>
            This browser can&apos;t install web apps. Open this page in Chrome or Edge — or scan the code below with
            your phone to install it there. {copyButton}
          </p>
        )}
      </div>
    );
  }

  // ---- the share block: a QR for computers, link buttons for phones --------------------------------------
  const share = isPhone ? (
    <section className={card}>
      <h2 className={h2}>Send this to a colleague</h2>
      <p className={muted}>They can install it the same way.</p>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={shareLink} className={smallButton}>
            Share…
          </button>
        )}
        {copyButton}
      </div>
      <p className="break-all font-mono text-xs text-black dark:text-zinc-50">{installUrl}</p>
    </section>
  ) : (
    <section className={`${card} sm:flex sm:items-center sm:gap-5 sm:space-y-0`}>
      {qr}
      <div className="space-y-2 pt-3 sm:pt-0">
        <h2 className={h2}>Install it on a phone</h2>
        <p className={muted}>
          Point the phone&apos;s camera at this code and tap the link that appears — it opens straight to the install
          button. Or send the address below. Print this page to put the code on a staff-room wall.
        </p>
        <p className="break-all font-mono text-xs text-black dark:text-zinc-50">{installUrl}</p>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {primary}
      {afterInstall}
      {share}
      <details className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950" open={!deviceKey}>
        <summary className="cursor-pointer text-sm font-medium text-black dark:text-zinc-50">
          Steps for every kind of device
        </summary>
        <div className="mt-4 space-y-4">{reference}</div>
      </details>
    </div>
  );
}
