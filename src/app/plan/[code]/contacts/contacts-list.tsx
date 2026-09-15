"use client";

import { useMemo, useState } from "react";
import type { Contact } from "@/lib/supabase/types";
import { PhoneIcon, MailIcon, SearchIcon } from "@/components/icons";
import { BRAND } from "@/lib/palette";

export function ContactsList({ contacts, canEdit = false }: { contacts: Contact[]; canEdit?: boolean }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(contacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.role_title, c.category].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [items, query]);

  const grouped = new Map<string, Contact[]>();
  for (const contact of filtered) {
    const key = contact.category ?? "Contacts";
    grouped.set(key, [...(grouped.get(key) ?? []), contact]);
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setDraft({ phone: contact.phone ?? "", email: contact.email ?? "" });
    setError(null);
  }

  async function save(contactId: string) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/staff-update-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, phone: draft.phone, email: draft.email }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save — try again.");
      return;
    }

    setItems((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, phone: draft.phone || null, email: draft.email || null } : c))
    );
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className={`w-full rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none dark:border-white/10 dark:bg-zinc-950 ${BRAND.focusBorder}`}
        />
      </div>

      {filtered.length === 0 && <p className="text-center text-sm text-zinc-500">No contacts found.</p>}

      {[...grouped.entries()].map(([category, list]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{category}</h2>
          <div className="space-y-2">
            {list.map((contact) =>
              editingId === contact.id ? (
                <div
                  key={contact.id}
                  className="space-y-2 rounded-xl border-2 border-black/10 bg-white p-3 dark:border-white/20 dark:bg-zinc-950"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft((v) => ({ ...v, phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none dark:border-white/10"
                  />
                  <input
                    value={draft.email}
                    onChange={(e) => setDraft((v) => ({ ...v, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none dark:border-white/10"
                  />
                  {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(contact.id)}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${BRAND.button}`}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-xs dark:border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                    {contact.role_title && (
                      <p className="truncate text-xs text-zinc-500">{contact.role_title}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canEdit && (
                      <button
                        onClick={() => startEdit(contact)}
                        aria-label={`Edit ${contact.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-500 dark:border-white/10"
                      >
                        ✎
                      </button>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        aria-label={`Email ${contact.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-white dark:bg-zinc-600"
                      >
                        <MailIcon className="h-5 w-5" />
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        aria-label={`Call ${contact.name}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${BRAND.button}`}
                      >
                        <PhoneIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
