"use client";

import { useEffect } from "react";
import type { AccessTier } from "@/lib/eop-session";
import { hasOfflineCopy, offlineSyncKey, readOfflineSyncMarker, writeOfflineSyncMarker } from "@/lib/offline-sync-key";
import { OFFLINE_RETRY_EVENT, setOfflineStatus, type OfflineStatus } from "@/lib/offline-status";

// How long a finished save is considered fresh. Pages someone opens are
// refreshed anyway (the service worker is network-first); this only bounds how
// often the whole plan is re-walked in the background.
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Wait for the page the person came for to finish loading first.
const SYNC_DELAY_MS = 4000;
const SYNC_TIMEOUT_MS = 2 * 60 * 1000;
// How long to wait for the service worker to become active before calling the
// save failed (it never will be where service workers can't register).
const WORKER_READY_TIMEOUT_MS = 20 * 1000;

// Asks the service worker to save every page of this plan for offline use, and
// reports how that went to the "offline copy" line on the home screen (see
// lib/offline-status.ts). Rendered only for someone who has passed the access
// gate (see plan layout), so the walk sees what that person is allowed to see —
// which is exactly why `tier` is part of the throttle key, not just `code`.
export function PlanOfflineSync({ code, tier }: { code: string; tier: AccessTier }) {
  useEffect(() => {
    // Keyed on tier, not just the plan code: a User-tier walk never sees the
    // Incident Management tile, so it never saves those pages. Without this,
    // someone who opens the app as staff and only unlocks Facility Admin
    // later — a completely normal sequence — would have the User-tier sync's
    // 6-hour cooldown silently block a fresh walk, leaving Incident
    // Management uncached and broken offline right when it matters most.
    const key = offlineSyncKey(code, tier);

    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      setOfflineStatus({ key, state: "unsupported" });
      return;
    }

    let cancelled = false;
    let running = false;
    let timer: number | undefined;
    // The saved copy we can vouch for right now: the marker says a complete save
    // finished AND the browser still really holds the pages. 0 = none.
    let savedAt = 0;

    const report = (status: Omit<OfflineStatus, "key">) => {
      if (!cancelled) setOfflineStatus({ key, ...status });
    };

    async function walk() {
      if (running || cancelled) return;
      running = true;
      // A background refresh of a copy that is already good changes nothing the
      // person sees; only a first save shows as "saving".
      if (!savedAt) report({ state: "saving" });
      try {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), WORKER_READY_TIMEOUT_MS)),
        ]);
        if (cancelled) return;
        if (!registration?.active) {
          if (!savedAt) report({ state: "failed" });
          return;
        }

        const channel = new MessageChannel();
        const finished = new Promise<{ ok?: boolean; pages?: number; failed?: number }>((resolve) => {
          channel.port1.onmessage = (event) => resolve(event.data ?? {});
          window.setTimeout(() => resolve({}), SYNC_TIMEOUT_MS);
        });
        registration.active.postMessage({ type: "sync-plan", code }, [channel.port2]);

        const result = await finished;
        if (cancelled) return;
        if (result.ok && (result.pages ?? 0) > 0) {
          // `failed` is undefined from a service worker older than this check;
          // that is treated as complete, as before.
          if ((result.failed ?? 0) === 0) {
            savedAt = writeOfflineSyncMarker(code, tier, result.pages ?? 0);
            report({ state: "ready", savedAt });
          } else if (!savedAt) {
            report({ state: "incomplete" });
          }
          // else: an earlier complete copy still stands; keep showing it, and the
          // incomplete refresh is simply tried again on the next visit.
        } else if (!savedAt) {
          report({ state: "failed" });
        }
      } catch {
        if (!savedAt) report({ state: "failed" });
      } finally {
        running = false;
      }
    }

    async function start() {
      const marker = readOfflineSyncMarker(code, tier);
      // A marker whose pages the browser has since thrown away (iPhone Safari
      // does this for sites unused for about a week) must not count — and must
      // not block a fresh save by looking recent.
      const present = marker !== null && (await hasOfflineCopy(code, marker.pages));
      if (cancelled) return;
      savedAt = present && marker ? marker.at : 0;
      if (savedAt) report({ state: "ready", savedAt });

      if (savedAt && Date.now() - savedAt < SYNC_INTERVAL_MS) return;
      if (!navigator.onLine) {
        if (!savedAt) report({ state: "none" });
        return;
      }
      if (!savedAt) report({ state: "saving" });
      timer = window.setTimeout(walk, SYNC_DELAY_MS);
    }
    void start();

    // "Try again" on the home screen: run the save now, ignoring the cooldown.
    const onRetry = () => {
      if (!navigator.onLine) {
        if (!savedAt) report({ state: "none" });
        return;
      }
      void walk();
    };
    // Back online with nothing saved yet: try without waiting for the next visit.
    const onOnline = () => {
      if (savedAt) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(walk, 1000);
    };
    window.addEventListener(OFFLINE_RETRY_EVENT, onRetry);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener(OFFLINE_RETRY_EVENT, onRetry);
      window.removeEventListener("online", onOnline);
    };
  }, [code, tier]);

  return null;
}
