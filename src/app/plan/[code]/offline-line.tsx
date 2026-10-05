"use client";

import { useEffect, useState } from "react";
import type { AccessTier } from "@/lib/eop-session";
import { OFFLINE_RETRY_EVENT, useOfflineStatus, type OfflineState } from "@/lib/offline-status";
import { offlineSyncKey } from "@/lib/offline-sync-key";

// One small status pill under "Access level" on the plan home screen: is this
// device holding an offline copy of the plan it can actually use? Kept to a
// single short line, tinted by state, with a fixed height so nothing on the
// screen moves when it changes. "Try again" only appears when it is useful.

type Tone = { pill: string; dot: string };
const NEUTRAL: Tone = { pill: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400", dot: "bg-zinc-400" };
const GOOD: Tone = { pill: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500" };
const WARN: Tone = { pill: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200", dot: "bg-amber-500" };

function savedAgo(savedAt: number, now: number): string {
  const minutes = Math.floor((now - savedAt) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function OfflineLine({ code, tier }: { code: string; tier: AccessTier }) {
  const status = useOfflineStatus();
  // Refresh "saved 2 min ago" while the screen stays open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // A state left over from another plan, or from before an unlock, is not about
  // what is on screen — show nothing rather than something wrong.
  const mine = status.key === offlineSyncKey(code, tier) ? status : null;
  const state: OfflineState = mine?.state ?? "checking";

  let tone: Tone = NEUTRAL;
  let pulse = false;
  let label = "";
  let retry = false;
  switch (state) {
    case "saving":
      pulse = true;
      label = "Saving for offline use…";
      break;
    case "ready":
      tone = GOOD;
      label = mine?.savedAt ? `Ready offline · saved ${savedAgo(mine.savedAt, now)}` : "Ready offline";
      break;
    case "incomplete":
      tone = WARN;
      label = "Offline copy incomplete";
      retry = true;
      break;
    case "failed":
      tone = WARN;
      label = "Couldn’t save for offline";
      retry = true;
      break;
    case "none":
      tone = WARN;
      label = "Not saved for offline yet — connect to save";
      break;
    case "unsupported":
      label = "Offline use isn’t available here";
      break;
    default:
      break; // "checking": keep the space, show nothing
  }

  return (
    <div className="flex min-h-7 items-center justify-center">
      {label && (
        <p role="status" className={`inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 rounded-full px-3 py-1 text-xs ${tone.pill}`}>
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone.dot} ${pulse ? "animate-pulse" : ""}`} />
          <span>{label}</span>
          {retry && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OFFLINE_RETRY_EVENT))}
              className="font-medium underline"
            >
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
