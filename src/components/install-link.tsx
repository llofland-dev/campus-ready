"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getInstallEvent, getInstalled, runInstallPrompt, subscribeInstallState } from "@/lib/install-prompt";

// The small install link on the welcome screen. Where the browser has offered a real install (Android, Chrome,
// Edge), it becomes a one-tap button right here; everywhere else it leads to the install page's steps. Hidden once
// the app is already installed.
export function InstallLink() {
  const installed = useSyncExternalStore(subscribeInstallState, getInstalled, () => false);
  const offer = useSyncExternalStore(subscribeInstallState, getInstallEvent, () => null);

  if (installed) return null;

  if (offer) {
    return (
      <button
        type="button"
        onClick={() => void runInstallPrompt(offer)}
        className="mt-4 text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
      >
        Install the app
      </button>
    );
  }

  return (
    <Link href="/install" className="mt-4 text-sm text-zinc-500 underline">
      Add to your home screen
    </Link>
  );
}
