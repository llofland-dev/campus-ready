"use client";

import { useState } from "react";
import { BRAND } from "@/lib/palette";
import { clearOfflineSyncMarkers } from "@/lib/offline-sync-key";

// Which level of the plan this device is signed in at, plus the two things
// the sign-in screen alone can't offer: stepping up to facility-admin access
// without clearing browser data, and signing out (e.g. on a shared phone).
export function PlanAccess({
  code,
  tier,
  canUnlock,
}: {
  code: string;
  tier: "user" | "admin";
  canUnlock: boolean;
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    let res: Response;
    try {
      res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password: passphrase, requireAdmin: true }),
      });
    } catch {
      setBusy(false);
      setError("You're offline. Unlocking admin access needs a connection.");
      return;
    }

    if (!res.ok) {
      setBusy(false);
      setError(res.status === 401 ? "That passphrase isn't right." : "Something went wrong. Please try again.");
      return;
    }

    // A full reload (not a soft refresh) so the saved offline copy of the plan
    // is replaced with the admin-level pages and the background save re-runs.
    clearOfflineSyncMarkers(code);
    window.location.reload();
  }

  async function signOut() {
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/signout", { method: "POST" });
      if (!res.ok) throw new Error("signout failed");
    } catch {
      setBusy(false);
      setError("You're offline. Signing out needs a connection.");
      return;
    }

    // Also drop this plan's copy saved for offline use: signing out on a
    // shared phone should not leave the plan readable.
    try {
      const wanted = `/plan/${code}`.toUpperCase();
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const path = decodeURIComponent(new URL(request.url).pathname).toUpperCase();
          if (path === wanted || path.startsWith(`${wanted}/`)) await cache.delete(request);
        }
      }
    } catch {
      // Best-effort: the cookie is already cleared, which is what gates access.
    }
    clearOfflineSyncMarkers(code);

    // Full navigation on purpose (not router.push) so nothing from the
    // signed-in page lingers in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/plan/${code}`);
  }

  function closeUnlock() {
    if (busy) return;
    setUnlocking(false);
    setPassphrase("");
    setError(null);
  }

  return (
    <>
      <div className="mt-8 space-y-3 text-center text-xs text-zinc-500">
        <p>
          Access level:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {tier === "admin" ? "Facility admin" : "User"}
          </span>
        </p>

        {canUnlock && !unlocking && (
          <button type="button" onClick={() => setUnlocking(true)} className="underline">
            Facility admin? Unlock admin access
          </button>
        )}

        {/* Sign-out problems only; the unlock dialog shows its own errors. */}
        {error && !unlocking && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div>
          <button type="button" onClick={signOut} disabled={busy} className="underline disabled:opacity-50">
            Sign out of this plan
          </button>
        </div>
      </div>

      {/* A dialog, not an inline form: inline, the passphrase box and buttons
          were squeezed between the page footer and the floating bottom nav
          (and, on a phone, the keyboard). Sitting above the nav, near the top,
          it stays clear of both. */}
      {canUnlock && unlocking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-title"
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 px-4 pt-[12vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeUnlock();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeUnlock();
          }}
        >
          <form onSubmit={unlock} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 text-left shadow-xl dark:bg-zinc-950">
            <div className="space-y-1">
              <h2 id="unlock-title" className="text-lg font-semibold text-[#00274c] dark:text-white">
                Facility admin access
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Enter your facility admin passphrase to unlock Incident Management.
              </p>
            </div>

            <input
              type="password"
              required
              autoFocus
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Facility admin passphrase"
              aria-label="Facility admin passphrase"
              className={`w-full rounded-full border border-black/10 bg-white px-4 py-3 text-base outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
            />

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={busy}
                className={`w-full rounded-full px-4 py-3 text-base font-medium text-white transition-colors disabled:opacity-50 ${BRAND.button} ${BRAND.buttonHover}`}
              >
                {busy ? "Checking..." : "Unlock"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={closeUnlock}
                className="w-full rounded-full px-4 py-2 text-sm text-zinc-600 underline disabled:opacity-50 dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
