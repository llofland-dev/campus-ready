"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/supabase/types";

const EMPTY = { name: "", role_title: "", phone: "", email: "", category: "", pinned: false };
const fieldClass =
  "rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

export function ContactsEditor({ orgId, contacts }: { orgId: string; contacts: Contact[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError(null);

    const nextOrder = contacts.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const { error } = await supabase.from("contacts").insert({
      org_id: orgId,
      name: form.name.trim(),
      role_title: form.role_title.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      category: form.category.trim() || null,
      pinned: form.pinned,
      sort_order: nextOrder,
    });

    setBusy(false);
    if (error) return setError(error.message);
    setForm(EMPTY);
    router.refresh();
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      role_title: c.role_title ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      category: c.category ?? "",
      pinned: c.pinned,
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        name: editForm.name.trim(),
        role_title: editForm.role_title.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        category: editForm.category.trim() || null,
        pinned: editForm.pinned,
      })
      .eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    setEditingId(null);
    router.refresh();
  }

  async function remove(c: Contact) {
    if (!confirm(`Remove ${c.name}?`)) return;
    const { error } = await supabase.from("contacts").delete().eq("id", c.id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function togglePinned(c: Contact) {
    const { error } = await supabase.from("contacts").update({ pinned: !c.pinned }).eq("id", c.id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = contacts[index + direction];
    const current = contacts[index];
    if (!target) return;
    setBusy(true);
    await Promise.all([
      supabase.from("contacts").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("contacts").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            className={`w-40 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Role / title</label>
          <input
            value={form.role_title}
            onChange={(e) => setForm((v) => ({ ...v, role_title: e.target.value }))}
            className={`w-40 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
            className={`w-32 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            className={`w-44 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Category</label>
          <input
            value={form.category}
            onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}
            placeholder="optional"
            className={`w-32 ${fieldClass}`}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(e) => setForm((v) => ({ ...v, pinned: e.target.checked }))}
          />
          Pin to home screen
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Add contact
        </button>
      </form>

      <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
        {contacts.map((c, index) =>
          editingId === c.id ? (
            <div key={c.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))}
                className={`w-40 ${fieldClass}`}
              />
              <input
                value={editForm.role_title}
                onChange={(e) => setEditForm((v) => ({ ...v, role_title: e.target.value }))}
                className={`w-40 ${fieldClass}`}
              />
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))}
                className={`w-32 ${fieldClass}`}
              />
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))}
                className={`w-44 ${fieldClass}`}
              />
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((v) => ({ ...v, category: e.target.value }))}
                className={`w-32 ${fieldClass}`}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={editForm.pinned}
                  onChange={(e) => setEditForm((v) => ({ ...v, pinned: e.target.checked }))}
                />
                Pin to home screen
              </label>
              <button
                onClick={() => saveEdit(c.id)}
                disabled={busy}
                className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-md border border-black/10 px-3 py-1 text-xs dark:border-white/10"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-black dark:text-zinc-50">
                  {c.name} {c.category && <span className="text-xs text-zinc-500">· {c.category}</span>}
                </p>
                <p className="text-xs text-zinc-500">
                  {[c.role_title, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 text-xs text-zinc-500">
                <button
                  onClick={() => togglePinned(c)}
                  title={c.pinned ? "Unpin from home screen" : "Pin to home screen"}
                  className={c.pinned ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600"}
                >
                  ★
                </button>
                <button onClick={() => move(index, -1)} disabled={index === 0 || busy} className="disabled:opacity-30">
                  ↑
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === contacts.length - 1 || busy}
                  className="disabled:opacity-30"
                >
                  ↓
                </button>
                <button onClick={() => startEdit(c)}>Edit</button>
                <button onClick={() => remove(c)} className="text-red-600 dark:text-red-400">
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {contacts.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">No contacts yet.</p>}
      </div>
    </div>
  );
}
