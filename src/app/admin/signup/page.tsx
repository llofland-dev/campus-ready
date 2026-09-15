"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminSignUpPage() {
  const supabase = createClient();

  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Carried through so CreateOrgForm (reached after confirming and
      // logging in, when there's no signup form to read from anymore) can
      // pre-fill what was already typed here instead of asking again.
      options: { data: { display_name: displayName, pending_org_name: orgName, pending_org_code: orgCode } },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // No session yet means this project requires email confirmation before
    // a session is issued — the org-creation RPC needs an authenticated
    // caller, so it can't run yet. CreateOrgForm (shown once they've
    // confirmed and signed in) finishes org creation instead.
    if (!signUpData.session) {
      setLoading(false);
      setCheckEmail(true);
      return;
    }

    const { error: orgError } = await supabase.rpc("eop_create_org_for_self", {
      p_name: orgName.trim(),
      p_org_code: orgCode.trim().toUpperCase(),
    });

    setLoading(false);

    if (orgError) {
      setError(
        orgError.message.includes("duplicate")
          ? "That plan code is already taken — try another."
          : orgError.message
      );
      return;
    }

    window.location.href = "/admin";
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <div className="w-full max-w-sm space-y-3 rounded-lg border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Check your email</h1>
          <p className="text-sm text-zinc-500">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click it,
            then{" "}
            <Link href="/admin/login" className="underline">
              sign in
            </Link>{" "}
            to finish setting up {orgName || "your organization"}.
          </p>
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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-white p-2">
            <Image src="/logo.png" alt="Emergency Preparedness Solutions" width={90} height={92} />
          </div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Set up your plan</h1>
          <p className="text-sm text-zinc-500">
            Creates your organization and your admin account together.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="org-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Organization name
          </label>
          <input
            id="org-name"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="org-code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Plan code
          </label>
          <input
            id="org-code"
            required
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            placeholder="e.g. ACME2026"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm uppercase outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          <p className="text-xs text-zinc-500">
            This is what staff type in to find your plan — share it, it&apos;s not secret. Set a
            password after sign-up if you want a second gate.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="display-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Your name
          </label>
          <input
            id="display-name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
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

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Setting up..." : "Create organization"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Already set up?{" "}
          <Link href="/admin/login" className="underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-zinc-400">
          By creating an organization, you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
