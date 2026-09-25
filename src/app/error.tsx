"use client";

import Link from "next/link";
import { BRAND } from "@/lib/palette";

// Shown instead of a blank screen when a page fails to render. The error
// itself is never displayed (it can contain internals) — just a way forward.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-[#00274c] dark:text-white">Something went wrong</h1>
      <p className="mt-2 max-w-xs text-sm text-zinc-500">
        This page couldn&apos;t be loaded. Check your connection and try again — pages you&apos;ve already
        opened are still available offline.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className={`rounded-full px-6 py-3 text-sm font-medium text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-black/10 px-6 py-3 text-sm font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-300"
        >
          Back to start
        </Link>
      </div>
    </div>
  );
}
