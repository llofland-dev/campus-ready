"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Chunk filenames change on every dev-server restart, but an already
      // active service worker keeps serving whatever it cached before the
      // restart — mixing an old chunk with the new page shell produces
      // hydration errors that have nothing to do with app code. Actively
      // unregister and clear caches so a previously-registered dev SW
      // (e.g. from testing on a phone) self-heals on next load, instead of
      // requiring the user to manually clear site data.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a nice-to-have, not a hard requirement — a
      // failed registration shouldn't block the app from working online.
    });
  }, []);

  return null;
}
