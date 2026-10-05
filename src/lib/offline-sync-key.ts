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

// What a finished, complete save left behind: when it finished and how many pages
// it stored. The page count is what lets "is the copy still there?" be answered
// honestly later — see hasOfflineCopy. Stored as "<time>:<pages>"; the plain
// timestamp written before this was added reads as "unknown" (null), which simply
// triggers one fresh save.
export interface OfflineSyncMarker {
  at: number;
  pages: number;
}

export function readOfflineSyncMarker(code: string, tier: AccessTier): OfflineSyncMarker | null {
  try {
    const raw = localStorage.getItem(offlineSyncKey(code, tier));
    const match = raw?.match(/^(\d+):(\d+)$/);
    return match ? { at: Number(match[1]), pages: Number(match[2]) } : null;
  } catch {
    return null;
  }
}

export function writeOfflineSyncMarker(code: string, tier: AccessTier, pages: number): number {
  const now = Date.now();
  try {
    localStorage.setItem(offlineSyncKey(code, tier), `${now}:${pages}`);
  } catch {
    // Best-effort.
  }
  return now;
}

// Whether the browser really still holds the pages the last complete save stored.
// The marker alone is not proof: iPhone Safari can delete a site's saved data after
// about a week unused, or under storage pressure, leaving the marker behind. And
// the home page alone is not proof either — just opening the plan saves that one
// page again — so this counts every saved page of the plan and needs nearly as
// many as the save reported. Case-insensitive because the code in the address may
// not match the case it was saved under.
export async function hasOfflineCopy(code: string, savedPages: number): Promise<boolean> {
  try {
    const root = `/plan/${code}`.toUpperCase();
    let count = 0;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const path = decodeURIComponent(new URL(request.url).pathname).toUpperCase();
        if (path === root || path.startsWith(`${root}/`)) count++;
      }
    }
    // A little slack on bigger plans: a page reached through a redirect can be
    // counted by the save under one entry fewer than it occupies here. A wiped
    // copy leaves only a page or two, nowhere near this.
    const needed = savedPages <= 3 ? savedPages : Math.floor(savedPages * 0.8);
    return count >= Math.max(1, needed);
  } catch {
    return false; // Treated as "no copy".
  }
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
