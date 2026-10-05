import { useSyncExternalStore } from "react";

// What the "offline copy" line on the plan home screen says. The background save
// (plan-offline-sync.tsx, mounted for the whole plan) writes it; the access panel
// on the home screen (plan-access.tsx) reads it. They are separate components, so
// the state lives here, in a tiny shared store.
//
//   checking     – haven't looked yet
//   saving       – a save is running and there is no saved copy to fall back on
//   ready        – a complete copy for THIS access level is saved on this device
//   incomplete   – a save ran but some pages did not make it; needs another go
//   failed       – the save could not run at all (no connection, worker not ready)
//   none         – nothing saved, and we are offline so cannot save now
//   unsupported  – this browser cannot keep an offline copy
export type OfflineState = "checking" | "saving" | "ready" | "incomplete" | "failed" | "none" | "unsupported";

// `key` names the plan + access level the state is about, so a state left over from
// another plan (or from before an unlock) is never shown as if it were current.
export interface OfflineStatus {
  key: string;
  state: OfflineState;
  savedAt?: number;
}

const INITIAL: OfflineStatus = { key: "", state: "checking" };

let current: OfflineStatus = INITIAL;
const listeners = new Set<() => void>();

export function setOfflineStatus(next: OfflineStatus): void {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The server-rendered snapshot is always "checking", so the first client render
// matches it and there is no hydration mismatch.
export function useOfflineStatus(): OfflineStatus {
  return useSyncExternalStore(subscribe, () => current, () => INITIAL);
}

// Sent by the "Try again" button; the background save listens for it.
export const OFFLINE_RETRY_EVENT = "eop-offline-retry";
