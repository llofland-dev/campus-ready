"use client";

import { useEffect } from "react";

// How long a finished save is considered fresh. Pages someone opens are
// refreshed anyway (the service worker is network-first); this only bounds how
// often the whole plan is re-walked in the background.
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Wait for the page the person came for to finish loading first.
const SYNC_DELAY_MS = 4000;
const SYNC_TIMEOUT_MS = 2 * 60 * 1000;

// Asks the service worker to save every page of this plan for offline use.
// Rendered only for someone who has passed the access gate (see plan layout),
// so the walk sees what that person is allowed to see.
export function PlanOfflineSync({ code }: { code: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return;

    const key = `eop-plan-sync:${code.toUpperCase()}`;
    try {
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last < SYNC_INTERVAL_MS) return;
    } catch {
      // Storage unavailable (private mode): sync every time instead of never.
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (cancelled || !registration.active) return;

        const channel = new MessageChannel();
        const finished = new Promise<{ ok?: boolean; pages?: number }>((resolve) => {
          channel.port1.onmessage = (event) => resolve(event.data ?? {});
          window.setTimeout(() => resolve({}), SYNC_TIMEOUT_MS);
        });
        registration.active.postMessage({ type: "sync-plan", code }, [channel.port2]);

        // Only a completed walk that saved something counts, so a sync cut
        // short by a dropped connection is retried on the next visit.
        const result = await finished;
        if (result.ok && (result.pages ?? 0) > 0) {
          try {
            localStorage.setItem(key, String(Date.now()));
          } catch {
            // Best-effort.
          }
        }
      } catch {
        // Offline support is a nice-to-have; never surface a failure here.
      }
    }, SYNC_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code]);

  return null;
}
