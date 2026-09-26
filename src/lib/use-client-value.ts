import { useSyncExternalStore } from "react";

// Nothing to subscribe to: the value can't change after the page loads.
const subscribe = () => () => {};

// A value that only exists in the browser (window.location, or anything that
// depends on the runtime's locale/timezone such as `toLocaleString()`).
//
// The server render and the hydrating first client render both return
// `fallback`, so their markup matches (no hydration mismatch); React then
// switches to `read()` on the client. This is React's supported way to do what
// used to be `useEffect(() => setState(...), [])`, which the react-hooks lint
// rule rejects because it renders twice.
//
// `read` must return a primitive (a string), so repeated calls compare equal.
export function useClientValue<T extends string | number | boolean>(read: () => T, fallback: T): T {
  return useSyncExternalStore(subscribe, read, () => fallback);
}
