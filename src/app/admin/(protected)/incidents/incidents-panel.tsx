"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Incident } from "@/lib/supabase/types";

export function IncidentsPanel({
  orgId,
  activeIncident,
  closedIncidents,
}: {
  orgId: string;
  activeIncident: Incident | null;
  closedIncidents: Incident[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    setStartError(null);

    const trimmed = name.trim();
    const { error } = await supabase.from("incidents").insert({
      org_id: orgId,
      name: trimmed || `Incident – ${new Date().toLocaleString()}`,
    });

    setStarting(false);

    if (error) {
      setStartError(error.message);
      return;
    }

    setName("");
    router.refresh();
  }

  async function handleClose() {
    if (!activeIncident) return;
    setClosing(true);

    await supabase
      .from("incidents")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", activeIncident.id);

    setClosing(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        {activeIncident ? (
          <>
            <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Active incident</h3>
            <p className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">{activeIncident.name}</p>
            <p className="mb-3 text-sm text-zinc-500">
              Started {new Date(activeIncident.started_at).toLocaleString()}. Every checklist item any
              staff member checks off right now is being logged against this incident.
            </p>
            <button
              onClick={handleClose}
              disabled={closing}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {closing ? "Closing..." : "Close incident"}
            </button>
          </>
        ) : (
          <>
            <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Start an incident</h3>
            <p className="mb-3 text-sm text-zinc-500">
              While an incident is active, every checklist check-off by any staff member on any
              device is logged to it automatically — nothing extra for them to do.
            </p>
            <form onSubmit={handleStart} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 space-y-1">
                <label htmlFor="incident-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Name (optional — defaults to date/time)
                </label>
                <input
                  id="incident-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lockdown Drill – East Wing"
                  className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                />
              </div>
              <button
                type="submit"
                disabled={starting}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              >
                {starting ? "Starting..." : "Start incident"}
              </button>
            </form>
            {startError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{startError}</p>}
          </>
        )}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Past incidents</h3>
        {closedIncidents.length === 0 ? (
          <p className="text-sm text-zinc-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {closedIncidents.map((incident) => (
              <li key={incident.id} className="py-2">
                <Link href={`/admin/incidents/${incident.id}`} className="text-sm font-medium underline">
                  {incident.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {new Date(incident.started_at).toLocaleString()}
                  {incident.closed_at ? ` – ${new Date(incident.closed_at).toLocaleString()}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
