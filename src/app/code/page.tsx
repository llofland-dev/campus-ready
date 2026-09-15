"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, SearchIcon } from "@/components/icons";
import { BRAND } from "@/lib/palette";

export default function CodeEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/plan/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} px-4 py-5 text-white`}>
        <div className="mx-auto flex max-w-sm items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/menu")}
            aria-label="Back"
            className="-ml-1 shrink-0 rounded-full p-1 hover:bg-white/10"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">View My Plan</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter your organization&apos;s plan code to get started.
          </p>

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter organization code"
              className={`w-full rounded-full border border-black/10 bg-white py-3.5 pl-10 pr-4 text-base uppercase outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
            />
          </div>

          <button
            type="submit"
            className={`w-full rounded-full px-4 py-3.5 text-base font-medium text-white transition-colors ${BRAND.button} ${BRAND.buttonHover}`}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
