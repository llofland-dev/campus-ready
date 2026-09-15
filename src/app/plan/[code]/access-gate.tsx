"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/palette";

export function AccessGate({
  code,
  orgName,
  hasPassword,
  hasAdminPassword,
  logoUrl,
}: {
  code: string;
  orgName: string;
  hasPassword: boolean;
  hasAdminPassword: boolean;
  logoUrl?: string | null;
}) {
  const showPasswordField = hasPassword || hasAdminPassword;
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function enter(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className={`${BRAND.header} px-4 py-5 text-white`}>
        <div className="mx-auto flex max-w-sm items-center gap-2">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded bg-white object-contain p-0.5" />
          )}
          <h1 className="truncate text-xl font-semibold">{orgName}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-sm px-4 py-8">
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {hasPassword ? "Enter the plan password to continue." : "Confirm to view this plan."}
        </p>

        <form onSubmit={enter} className="space-y-4">
          {showPasswordField && (
            <input
              id="password"
              type="password"
              required={hasPassword}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasPassword ? "Password" : "Password (optional)"}
              className={`w-full rounded-full border border-black/10 bg-white px-4 py-3.5 text-base outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
            />
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-full px-4 py-3.5 text-base font-medium text-white transition-colors disabled:opacity-50 ${BRAND.button} ${BRAND.buttonHover}`}
          >
            {submitting ? "Checking..." : "View plan"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Wrong organization?{" "}
          <Link href="/code" className="underline">
            Enter a different code
          </Link>
        </p>

        <div className="mt-12 flex flex-col items-center gap-1 opacity-70">
          <span className="text-[11px] uppercase tracking-wide text-zinc-400">Powered by</span>
          <div className="rounded-xl bg-white p-2">
            <Image src="/logo.png" alt="Emergency Preparedness Solutions" width={110} height={112} />
          </div>
        </div>
      </div>
    </div>
  );
}
