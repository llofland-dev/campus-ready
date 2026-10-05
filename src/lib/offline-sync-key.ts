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
