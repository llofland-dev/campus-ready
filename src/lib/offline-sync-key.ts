import type { AccessTier } from "@/lib/eop-session";

// The localStorage marker that says "this device already saved this plan for
// offline use at this access level, recently". One place builds it, and one
// place clears it, so the background save (plan-offline-sync.tsx) and the
// sign-out / unlock code (plan-access.tsx) can never disagree about its name —
// a mismatch there once meant signing out deleted the offline copy but left the
// marker behind, so signing straight back in skipped the re-save.
export function offlineSyncKey(code: string, tier: AccessTier): string {
  return `eop-plan-sync:${code.toUpperCase()}:${tier}`;
}

// When this device last finished a complete save at this access level (0 = never).
export function readOfflineSyncMarker(code: string, tier: AccessTier): number {
  try {
    return Number(localStorage.getItem(offlineSyncKey(code, tier)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function writeOfflineSyncMarker(code: string, tier: AccessTier): number {
  const now = Date.now();
  try {
    localStorage.setItem(offlineSyncKey(code, tier), String(now));
  } catch {
    // Best-effort.
  }
  return now;
}

// Whether the browser really still holds this plan's home page. The marker alone
// is not proof: iPhone Safari can delete a site's saved data after about a week
// unused, or under storage pressure, leaving the marker behind. Case-insensitive
// because the code in the address may not match the case it was saved under.
export async function hasOfflineCopy(code: string): Promise<boolean> {
  try {
    const wanted = `/plan/${code}`.toUpperCase();
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (decodeURIComponent(new URL(request.url).pathname).toUpperCase() === wanted) return true;
      }
    }
  } catch {
    // Treated as "no copy".
  }
  return false;
}

// Clears the markers for both access levels, plus the pre-tier name that
// devices saved before the tier fix may still hold.
export function clearOfflineSyncMarkers(code: string): void {
  try {
    localStorage.removeItem(offlineSyncKey(code, "user"));
    localStorage.removeItem(offlineSyncKey(code, "admin"));
    localStorage.removeItem(`eop-plan-sync:${code.toUpperCase()}`);
  } catch {
    // Storage unavailable — the save simply runs on its normal schedule.
  }
}
