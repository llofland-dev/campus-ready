"use client";

import { useClientValue } from "@/lib/use-client-value";

// Shows a timestamp in the VIEWER's own timezone.
//
// `toLocaleString()` uses the timezone of whatever runs it. Run on the server (Vercel is UTC) it
// prints UTC, so a parent in New York saw an update posted at 2:43 PM stamped "6:43 PM". Inside a
// client component it also made the server HTML and the browser disagree (React error #418). So
// the server render — and the render that hydrates it — use a plain, labeled UTC string that is
// identical on both sides (built from toISOString: no locale or ICU differences); once the browser
// takes over, this switches to the viewer's local time. Without JavaScript the UTC text stays,
// clearly marked, rather than a wrong local time.
function utcText(iso: string, timeOnly: boolean) {
  const stamp = new Date(iso).toISOString().slice(0, 16).replace("T", " "); // 2026-09-26 18:43
  return `${timeOnly ? stamp.slice(11) : stamp} UTC`;
}

export function ClientTime({ iso, timeOnly = false }: { iso: string; timeOnly?: boolean }) {
  const text = useClientValue(() => {
    const d = new Date(iso);
    return timeOnly ? d.toLocaleTimeString() : d.toLocaleString();
  }, utcText(iso, timeOnly));
  return <time dateTime={iso}>{text}</time>;
}
