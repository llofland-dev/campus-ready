"use client";

import { useEffect, useState } from "react";
import type { Checklist, ChecklistItem, Incident } from "@/lib/supabase/types";
import { BRAND } from "@/lib/palette";
import { getActorName, setActorName } from "@/lib/actor-name";

// Check-off state lives in localStorage — it's what makes the checkbox UI
// itself instant and offline-proof, so that logic is untouched. Alongside
// it, each toggle now also fires a best-effort POST to /api/checklist-event,
// which is how a real incident's checklist activity becomes After-Action
// Review evidence (see the admin Incidents panel). The POST never blocks or
// gates the checkbox — if it fails (no connectivity, server hiccup), the UI
// behaves exactly as it always has.
export function ChecklistRunner({
  checklist,
  items,
  activeIncident,
}: {
  checklist: Checklist;
  items: ChecklistItem[];
  activeIncident: Incident | null;
}) {
  const storageKey = `eop-checklist-${checklist.id}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [actorName, setActorNameState] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [namePromptDismissed, setNamePromptDismissed] = useState(false);

  useEffect(() => {
    // Reading localStorage during the initial render (instead of here)
    // would mismatch the server-rendered HTML, since localStorage doesn't
    // exist during SSR — syncing from it after mount is the standard fix.
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    }
    setActorNameState(getActorName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logEvent(itemId: string, itemText: string, action: "checked" | "unchecked") {
    fetch("/api/checklist-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checklistId: checklist.id,
        itemId,
        itemText,
        action,
        actorName: actorName ?? undefined,
      }),
    }).catch(() => {
      // Best-effort only — the checkbox UI already reflects the change via
      // localStorage regardless of whether this succeeds.
    });
  }

  function toggle(item: ChecklistItem) {
    setChecked((prev) => {
      const next = { ...prev, [item.id]: !prev[item.id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    logEvent(item.id, item.text, checked[item.id] ? "unchecked" : "checked");
  }

  function reset() {
    setChecked({});
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  function saveActorName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setActorName(trimmed);
    setActorNameState(trimmed);
  }

  const doneCount = items.filter((item) => checked[item.id]).length;

  return (
    <div className="space-y-4">
      {activeIncident && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-200">
          Incident active: <span className="font-medium">{activeIncident.name}</span>
        </div>
      )}

      {!actorName && !namePromptDismissed && (
        <form
          onSubmit={saveActorName}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-950"
        >
          <span className="text-zinc-500">Add your name so activity shows who did what — optional.</span>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 outline-none dark:border-white/10"
          />
          <button type="submit" className="font-medium underline">
            Save
          </button>
          <button
            type="button"
            onClick={() => setNamePromptDismissed(true)}
            className="text-zinc-400 underline"
          >
            Skip
          </button>
        </form>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          {doneCount} of {items.length} complete
        </span>
        <button onClick={reset} className="underline">
          Reset
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex min-h-14 items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-950"
          >
            <input
              type="checkbox"
              checked={Boolean(checked[item.id])}
              onChange={() => toggle(item)}
              className={`h-5 w-5 shrink-0 ${BRAND.accent}`}
            />
            <span
              className={`text-base ${
                checked[item.id]
                  ? "text-zinc-400 line-through dark:text-zinc-600"
                  : "text-black dark:text-zinc-50"
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {items.length === 0 && <p className="text-sm text-zinc-500">This checklist is empty.</p>}
    </div>
  );
}
