"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tucked into the admin footer (visible on every admin screen, including the
// "finish creating your organization" state) rather than buried in a settings
// page — account deletion must be easy to find, but hard to trigger by accident.
export function DeleteAccountPanel({ orgCode }: { orgCode: string | null }) {
  const supabase = createClient();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = orgCode ?? "DELETE";
  const ready = confirm.trim().toUpperCase() === expected.toUpperCase();

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;

    setDeleting(true);
    setError(null);

    let res: Response;
    try {
      res = await fetch("/api/admin/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
    } catch {
      setDeleting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleting(false);
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    await supabase.auth.signOut();
    // Full reload on purpose: drops every piece of signed-in client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <details className="mx-auto max-w-3xl px-6 pb-10 text-sm">
      <summary className="cursor-pointer text-zinc-500 hover:underline">Delete account</summary>
      <form
        onSubmit={handleDelete}
        className="mt-3 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
      >
        <p className="text-red-800 dark:text-red-300">
          {orgCode
            ? "This permanently deletes your login. If you're your organization's only admin, it also permanently deletes the organization and everything in it — plan content, contacts, forms, checklists, and saved submissions. This can't be undone."
            : "This permanently deletes your login. This can't be undone."}
        </p>
        <label htmlFor="delete-confirm" className="block text-xs font-medium text-red-900 dark:text-red-200">
          {orgCode ? (
            <>
              Type your plan code (<span className="font-mono">{orgCode}</span>) to confirm
            </>
          ) : (
            <>
              Type <span className="font-mono">DELETE</span> to confirm
            </>
          )}
        </label>
        <input
          id="delete-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm outline-none dark:border-red-800 dark:bg-zinc-950"
        />
        {error && <p className="text-red-700 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!ready || deleting}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-40"
        >
          {deleting ? "Deleting..." : "Permanently delete my account"}
        </button>
      </form>
    </details>
  );
}
