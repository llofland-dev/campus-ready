"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";

// This page has no fixed parent route to link back to — it's reachable
// both as a standalone link a parent gets texted (no app context at all)
// and from inside the staff app (the Reunification banner). Browser/history
// back is the right affordance for the latter case and a harmless no-op for
// the former. Needed as its own button, not just OS/browser chrome, because
// an installed PWA has no back arrow of its own to fall back on.
export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Back"
      className="-ml-1 shrink-0 rounded-full p-1 hover:bg-white/10"
    >
      <ChevronLeftIcon className="h-6 w-6" />
    </button>
  );
}
