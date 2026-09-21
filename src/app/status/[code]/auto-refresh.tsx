"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps this no-login status page current without anyone tapping a refresh
// button — the audience is a parent watching this screen during an active
// incident, not someone who'll think to reload it themselves.
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
