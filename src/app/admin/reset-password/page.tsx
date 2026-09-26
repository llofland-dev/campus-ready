"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INVALID_LINK = "This reset link is invalid or has expired. Request a new one.";

// Reached via the link in the password-reset (or invite) email. Three link
// shapes can arrive here, and this page handles all of them:
//
//  1. `?token_hash=…&type=recovery|invite` — what the Supabase email
//     templates should send (see docs/SUPABASE_EMAIL_TEMPLATES.md). It works in
//     ANY browser or device, because it doesn't depend on state stored by the
//     browser that asked for the reset. That matters: people request a reset
//     on a laptop and open the email on their phone.
//  2. `?code=…` — the PKCE link Supabase sends with its stock templates.
//     `@supabase/ssr` forces PKCE, and the code only works in the SAME browser
//     that requested the reset (its verifier lives in that browser's cookie).
//  3. `#access_token=…&refresh_token=…` — an implicit-flow link, e.g. from the
//     dashboard's "Send password recovery" or an admin-generated link.
//
// A token_hash is single-use, and school/district mail filters often open every
// link in an email to scan it. So the token is only redeemed when the person
// presses the button — never on page load — otherwise a scanner would use it
// up before they ever clicked.
type TokenLink = { tokenHash: string; type: "recovery" | "invite" };

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkBroken, setLinkBroken] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // Set when the URL carries a token_hash that hasn't been redeemed yet.
  const tokenLink = useRef<TokenLink | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    // Token links are only remembered here and redeemed on submit (see
    // above); an unknown `type` is treated as a broken link.
    const validTokenType = type === "recovery" || type === "invite";
    if (tokenHash && validTokenType) tokenLink.current = { tokenHash, type };

    const establishSession = tokenHash
      ? Promise.resolve({ error: validTokenType ? null : new Error("bad link type") })
      : code
        ? supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : Promise.resolve({ error: hashParams.get("error") ? new Error("expired") : null });

    establishSession.then(({ error }) => {
      if (error) {
        setError(INVALID_LINK);
        setLinkBroken(true);
      }
      setReady(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    if (tokenLink.current) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: tokenLink.current.tokenHash,
        type: tokenLink.current.type,
      });
      if (otpError) {
        setLoading(false);
        setError(INVALID_LINK);
        setLinkBroken(true);
        return;
      }
      // Redeemed: the browser now holds a session. If the password is
      // rejected below (too weak, etc.) a retry must not redeem it again.
      tokenLink.current = null;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-black">
        <div className="w-full max-w-sm space-y-3 rounded-lg border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Password updated</h1>
          <p className="text-sm text-zinc-500">You can now sign in with your new password.</p>
          <a href="/admin" className="inline-block text-sm underline">
            Go to admin
          </a>
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
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Set a new password</h1>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New password
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

        <div className="space-y-1">
          <label htmlFor="confirm" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {linkBroken && (
          <p className="text-sm">
            <Link href="/admin/forgot-password" className="underline">
              Request a new reset link
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !ready || linkBroken}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {!ready ? "Verifying link..." : loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
