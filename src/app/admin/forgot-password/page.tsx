"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setLoading(false);

    // Always show the same success message regardless of whether the email
    // exists — confirming/denying an account's existence to an anonymous
    // visitor is an account-enumeration leak.
    if (!error) setSent(true);
    else setError("Something went wrong. Try again in a moment.");
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <div className="w-full max-w-sm space-y-3 rounded-lg border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Check your email</h1>
          <p className="text-sm text-zinc-500">
            If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a
            link to reset your password.
          </p>
          <Link href="/admin/login" className="inline-block text-sm underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950"
      >
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Reset your password</h1>
          <p className="text-sm text-zinc-500">
            Enter your admin account email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          <Link href="/admin/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
