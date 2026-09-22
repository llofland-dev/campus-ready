"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Incident, IncidentUpdate } from "@/lib/supabase/types";
import { MailIncidentReport } from "@/components/mail-incident-report";

// `toLocaleString()` depends on the runtime's locale/timezone, which can
// differ between this server-rendered pass (Node) and the browser that
// hydrates it — a real, if latent, hydration-mismatch risk in a client
// component. Rendering nothing until mount sidesteps it: server and the
// first client render both produce the same (empty) markup.
function ClientTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(new Date(iso).toLocaleString()), [iso]);
  return <>{text}</>;
}

function StatusLink({ orgCode }: { orgCode: string }) {
  const [copied, setCopied] = useState(false);
  // Built client-side from window.location so it matches whichever host
  // this admin panel is actually being viewed on (localhost while testing,
  // the live domain otherwise) rather than a hardcoded origin. Set in an
  // effect, not during render, so server and first client render both
  // produce the same empty-string markup — avoids a hydration mismatch.
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/status/${orgCode}`);
  }, [orgCode]);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Public status page</h3>
      <p className="mb-3 text-sm text-zinc-500">
        No login, no plan code needed — share this link with families. It always shows pick-up
        info, plus live updates whenever an incident is active.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-zinc-900">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-md border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/10"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </section>
  );
}

function UpdatesComposer({
  orgId,
  incidentId,
  updates,
}: {
  orgId: string;
  incidentId: string;
  updates: IncidentUpdate[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setPosting(true);
    setError(null);

    const { error } = await supabase.from("incident_updates").insert({
      org_id: orgId,
      incident_id: incidentId,
      message: trimmed,
    });

    setPosting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("incident_updates").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
      <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Post an update — families see this immediately on the public status page
      </h4>
      <form onSubmit={handlePost} className="flex flex-wrap items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Lockdown in effect since 2:15pm. No other information at this time."
          rows={2}
          className="min-w-[240px] flex-1 rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        <button
          type="submit"
          disabled={posting || !message.trim()}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {posting ? "Posting..." : "Post update"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {updates.length > 0 && (
        <ul className="space-y-2">
          {updates.map((u) => (
            <li
              key={u.id}
              className="flex items-start justify-between gap-3 rounded-md border border-black/10 bg-zinc-50 p-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div>
                <p className="text-zinc-500">
                  <ClientTime iso={u.created_at} />
                </p>
                <p className="text-black dark:text-zinc-50">{u.message}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(u.id)}
                className="shrink-0 text-xs text-red-600 dark:text-red-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IncidentsPanel({
  orgId,
  orgCode,
  orgName,
  activeIncident,
  closedIncidents,
  updates,
  contactOptions,
}: {
  orgId: string;
  orgCode: string;
  orgName: string;
  activeIncident: Incident | null;
  closedIncidents: Incident[];
  updates: IncidentUpdate[];
  contactOptions: { name: string; roleTitle: string | null; email: string }[];
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
      <StatusLink orgCode={orgCode} />

      <section className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        {activeIncident ? (
          <>
            <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Active incident</h3>
            <p className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">{activeIncident.name}</p>
            <p className="mb-3 text-sm text-zinc-500">
              Started <ClientTime iso={activeIncident.started_at} />. Every checklist item any
              staff member checks off right now is being logged against this incident.
            </p>
            <button
              onClick={handleClose}
              disabled={closing}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {closing ? "Closing..." : "Close incident"}
            </button>

            <UpdatesComposer orgId={orgId} incidentId={activeIncident.id} updates={updates} />

            <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
              <MailIncidentReport
                orgName={orgName}
                incidentName={activeIncident.name}
                startedAt={activeIncident.started_at}
                closedAt={activeIncident.closed_at}
                updates={updates}
                contactOptions={contactOptions}
              />
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Start an incident</h3>
            <p className="mb-3 text-sm text-zinc-500">
              While an incident is active, every checklist check-off by any staff member on any
              device is logged to it automatically — nothing extra for them to do. You'll also be
              able to post plain-language updates for families on the public status page above.
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
                  <ClientTime iso={incident.started_at} />
                  {incident.closed_at && (
                    <>
                      {" – "}
                      <ClientTime iso={incident.closed_at} />
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
