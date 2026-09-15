"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Checklist, ChecklistItem } from "@/lib/supabase/types";
import { CATEGORIES } from "@/lib/categories";

const fieldClass =
  "w-full rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

export function ChecklistsEditor({
  orgId,
  checklists,
  items,
}: {
  orgId: string;
  checklists: Checklist[];
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedId, setSelectedId] = useState<string | null>(checklists[0]?.id ?? null);
  const [newChecklist, setNewChecklist] = useState({
    title: "",
    description: "",
    category: "",
    homeCategory: "",
    subcategory: "",
  });
  const [newItemText, setNewItemText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = checklists.find((c) => c.id === selectedId) ?? null;
  const selectedItems = items
    .filter((i) => i.checklist_id === selectedId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function addChecklist(e: React.FormEvent) {
    e.preventDefault();
    if (!newChecklist.title.trim()) return;
    setBusy(true);
    setError(null);

    const nextOrder = checklists.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from("checklists")
      .insert({
        org_id: orgId,
        title: newChecklist.title.trim(),
        description: newChecklist.description.trim() || null,
        category: newChecklist.category.trim() || null,
        home_category: newChecklist.homeCategory || null,
        subcategory: newChecklist.subcategory.trim() || null,
        sort_order: nextOrder,
      })
      .select("id")
      .single();

    setBusy(false);
    if (error) return setError(error.message);
    setNewChecklist({ title: "", description: "", category: "", homeCategory: "", subcategory: "" });
    setSelectedId(data.id);
    router.refresh();
  }

  async function deleteChecklist(c: Checklist) {
    if (!confirm(`Delete "${c.title}" and all its items?`)) return;
    const { error } = await supabase.from("checklists").delete().eq("id", c.id);
    if (error) return setError(error.message);
    if (selectedId === c.id) setSelectedId(null);
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !newItemText.trim()) return;
    setBusy(true);
    setError(null);

    const nextOrder = selectedItems.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1;
    const { error } = await supabase.from("checklist_items").insert({
      org_id: orgId,
      checklist_id: selectedId,
      text: newItemText.trim(),
      sort_order: nextOrder,
    });

    setBusy(false);
    if (error) return setError(error.message);
    setNewItemText("");
    router.refresh();
  }

  async function deleteItem(item: ChecklistItem) {
    const { error } = await supabase.from("checklist_items").delete().eq("id", item.id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const target = selectedItems[index + direction];
    const current = selectedItems[index];
    if (!target) return;
    setBusy(true);
    await Promise.all([
      supabase.from("checklist_items").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("checklist_items").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Checklists</h3>
        <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
          {checklists.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-1 px-3 py-2">
              <button
                onClick={() => setSelectedId(c.id)}
                className={`truncate text-left text-sm ${
                  selectedId === c.id ? "font-medium text-black dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {c.title}
                {c.category && <span className="ml-1 text-xs text-zinc-500">({c.category})</span>}
                {c.home_category && (
                  <span className="ml-1 text-xs text-zinc-400">
                    [{CATEGORIES.find((cat) => cat.key === c.home_category)?.label ?? c.home_category}
                    {c.subcategory && ` / ${c.subcategory}`}]
                  </span>
                )}
              </button>
              <button onClick={() => deleteChecklist(c)} className="shrink-0 text-xs text-red-600 dark:text-red-400">
                ✕
              </button>
            </div>
          ))}
          {checklists.length === 0 && <p className="px-3 py-2 text-sm text-zinc-500">None yet.</p>}
        </div>

        <form onSubmit={addChecklist} className="space-y-1.5">
          <input
            value={newChecklist.title}
            onChange={(e) => setNewChecklist((v) => ({ ...v, title: e.target.value }))}
            placeholder="New checklist title"
            className={fieldClass}
          />
          <textarea
            value={newChecklist.description}
            onChange={(e) => setNewChecklist((v) => ({ ...v, description: e.target.value }))}
            placeholder="Description / mission statement (optional, shown above the items, not a checkbox)"
            rows={2}
            className={fieldClass}
          />
          <input
            value={newChecklist.category}
            onChange={(e) => setNewChecklist((v) => ({ ...v, category: e.target.value }))}
            placeholder="Subtitle (optional, e.g. a role name)"
            className={fieldClass}
          />
          <select
            value={newChecklist.homeCategory}
            onChange={(e) => setNewChecklist((v) => ({ ...v, homeCategory: e.target.value }))}
            className={fieldClass}
          >
            <option value="">Not on a home tile (Checklists list only)</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={newChecklist.subcategory}
            onChange={(e) => setNewChecklist((v) => ({ ...v, subcategory: e.target.value }))}
            placeholder="Sub-group on that tile (optional, e.g. Job Action Sheets)"
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Add checklist
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!selected ? (
          <p className="text-sm text-zinc-500">Select or create a checklist to add items.</p>
        ) : (
          <>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Items in &quot;{selected.title}&quot;
            </h3>

            <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
              {selectedItems.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="text-sm text-black dark:text-zinc-50">{item.text}</span>
                  <div className="flex shrink-0 gap-1 text-xs text-zinc-500">
                    <button onClick={() => moveItem(index, -1)} disabled={index === 0 || busy} className="disabled:opacity-30">
                      ↑
                    </button>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === selectedItems.length - 1 || busy}
                      className="disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button onClick={() => deleteItem(item)} className="text-red-600 dark:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {selectedItems.length === 0 && (
                <p className="px-4 py-2 text-sm text-zinc-500">No items yet.</p>
              )}
            </div>

            <form onSubmit={addItem} className="flex gap-2">
              <input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="New item text"
                className={fieldClass}
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              >
                Add
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
