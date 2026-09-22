"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Incident, IncidentUpdate } from "@/lib/supabase/types";

async function callAction(body: Record<string, unknown>) {
  const res = await fetch("/api/incident-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
}

export function IncidentManagementPanel({
  code,
  activeIncident,
  updates,
}: {
  code: string;
  activeIncident: Incident | null;
  updates: IncidentUpdate[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set in an effect, not during render, so the server-rendered pass and
  // the first client render both produce the same (empty) markup — avoids
  // a hydration mismatch (see the identical fix in incidents-panel.tsx).
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callAction({ action: "start", name: name.trim() });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the incident.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!activeIncident || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await callAction({ action: "post_update", incidentId: activeIncident.id, message: message.trim() });
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post the update.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (!activeIncident) return;
    setBusy(true);
    setError(null);
    try {
      await callAction({ action: "close", incidentId: activeIncident.id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't close the incident.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Public status page</h2>
        <p className="mb-3 text-sm text-zinc-500">
          No login needed — share this with families for live updates and pick-up info.
        </p>
        <code className="block truncate rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900">
          {origin}/status/{code}
        </code>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        {activeIncident ? (
          <>
            <h2 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Active incident</h2>
            <p className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">{activeIncident.name}</p>

            <button
              onClick={handleClose}
              disabled={busy}
              className="mb-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {busy ? "Working..." : "Close incident"}
            </button>

            <form onSubmit={handlePost} className="space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Post an update — families see this immediately
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Lockdown in effect since 2:15pm. No other information at this time."
                rows={2}
                className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
              <button
                type="submit"
                disabled={busy || !message.trim()}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {busy ? "Posting..." : "Post update"}
              </button>
            </form>

            {updates.length > 0 && (
              <ul className="mt-4 space-y-2">
                {updates.map((u) => (
                  <li key={u.id} className="rounded-md border border-black/10 bg-zinc-50 p-2 text-sm dark:border-white/10 dark:bg-zinc-900">
                    <p className="text-zinc-500">{new Date(u.created_at).toLocaleString()}</p>
                    <p className="text-black dark:text-zinc-50">{u.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Start an incident</h2>
            <p className="mb-3 text-sm text-zinc-500">
              Starting one lets you post live updates to the public status page, and every
              checklist check-off from here on logs against it automatically.
            </p>
            <form onSubmit={handleStart} className="space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lockdown Drill – East Wing (optional)"
                className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {busy ? "Starting..." : "Start incident"}
              </button>
            </form>
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
    </div>
  );
}
