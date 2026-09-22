"use client";

import { useState } from "react";
import type { IncidentUpdate } from "@/lib/supabase/types";

// Compiles an incident's start time and every posted update into a plain-
// text email via mailto: — same pattern as form-filler.tsx's "Email this
// form" (no server-side email provider in this app; the device's own mail
// app sends it). Built for After-Action Review: whoever managed the
// incident sends this to school leadership once it's over, or at any point
// along the way.
export function MailIncidentReport({
  orgName,
  incidentName,
  startedAt,
  closedAt,
  updates,
  contactOptions,
}: {
  orgName: string;
  incidentName: string;
  startedAt: string;
  closedAt: string | null;
  updates: IncidentUpdate[];
  contactOptions: { name: string; roleTitle: string | null; email: string }[];
}) {
  const [to, setTo] = useState("");

  function send() {
    const lines = [
      `Incident: ${incidentName}`,
      `Organization: ${orgName}`,
      `Started: ${new Date(startedAt).toLocaleString()}`,
      closedAt ? `Closed: ${new Date(closedAt).toLocaleString()}` : "Status: Still active",
      "",
      "Updates:",
      ...(updates.length > 0
        ? updates
            .slice()
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((u) => `${new Date(u.created_at).toLocaleString()} — ${u.message}`)
        : ["(none posted)"]),
    ];

    const subject = encodeURIComponent(`Incident Report — ${incidentName}`);
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:${to.trim()}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Mail to — for After-Action Review
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="name@example.com"
          className="min-w-[200px] flex-1 rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        {contactOptions.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          >
            <option value="">From contacts…</option>
            {contactOptions.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name}
                {c.roleTitle ? ` — ${c.roleTitle}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={send}
        disabled={!to.trim()}
        className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/10"
      >
        Email incident report
      </button>
    </div>
  );
}
