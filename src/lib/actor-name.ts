// One-time, optional "who is this" capture for checklist activity events.
// Stored per-device, not per-account — this app has no staff login. Skipping
// it entirely just means events go through with a null actor_name; the
// timestamp and action are still useful on their own.
const KEY = "eop-actor-name";

export function getActorName(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActorName(name: string) {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
}
