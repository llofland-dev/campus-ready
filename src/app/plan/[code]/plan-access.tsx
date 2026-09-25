"use client";

import { useState } from "react";
import { BRAND } from "@/lib/palette";

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
    try {
      localStorage.removeItem(`eop-plan-sync:${code.toUpperCase()}`);
    } catch {
      // Storage unavailable — the sync simply runs on its normal schedule.
    }
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
      localStorage.removeItem(`eop-plan-sync:${code.toUpperCase()}`);
    } catch {
      // Best-effort: the cookie is already cleared, which is what gates access.
    }

    // Full navigation on purpose (not router.push) so nothing from the
    // signed-in page lingers in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/plan/${code}`);
  }

  return (
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

      {canUnlock && unlocking && (
        <form onSubmit={unlock} className="mx-auto max-w-xs space-y-2">
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 ${BRAND.button} ${BRAND.buttonHover}`}
            >
              {busy ? "Checking..." : "Unlock"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setUnlocking(false);
                setPassphrase("");
                setError(null);
              }}
              className="rounded-full px-4 py-3 text-sm underline disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div>
        <button type="button" onClick={signOut} disabled={busy} className="underline disabled:opacity-50">
          Sign out of this plan
        </button>
      </div>
    </div>
  );
}
