"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanMap } from "@/lib/supabase/types";
import { MAP_ACCEPT, MAP_BUCKET, MAP_TYPES, MAX_MAP_BYTES, formatBytes, isPdf } from "@/lib/plan-maps";

const fieldClass =
  "rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";
const labelClass = "text-xs font-medium text-zinc-600 dark:text-zinc-400";
const primaryButton =
  "rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]";

// Staff download every map to their phones for offline use, so keep the total modest.
const SOFT_TOTAL_BYTES = 100 * 1024 * 1024;

export function MapsEditor({
  orgId,
  maps,
  previews,
}: {
  orgId: string;
  maps: PlanMap[];
  previews: Record<string, string>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", category: "", description: "" });

  const totalBytes = maps.reduce((sum, m) => sum + (m.file_size ?? 0), 0);

  function pickFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!MAP_TYPES[next.type]) {
      setFile(null);
      setFileInputKey((k) => k + 1);
      return setError("Please choose a PNG, JPG or WebP image, or a PDF.");
    }
    if (next.size > MAX_MAP_BYTES) {
      setFile(null);
      setFileInputKey((k) => k + 1);
      return setError(`That file is ${formatBytes(next.size)}. The limit is ${formatBytes(MAX_MAP_BYTES)} — try exporting it at a lower size.`);
    }
    setFile(next);
    // Suggest a title from the file name, but never overwrite one the admin has typed.
    if (!title.trim()) setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const type = MAP_TYPES[file.type];
    if (!type) return;
    setBusy(true);
    setError(null);

    // The object path always starts with this org's id — the storage policy only lets an admin write there.
    const path = `${orgId}/${crypto.randomUUID()}.${type.ext}`;
    const { error: uploadError } = await supabase.storage.from(MAP_BUCKET).upload(path, file, { contentType: file.type });
    if (uploadError) {
      setBusy(false);
      return setError(uploadError.message);
    }

    const nextOrder = maps.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1;
    const { error: insertError } = await supabase.from("plan_maps").insert({
      org_id: orgId,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      file_path: path,
      content_type: file.type,
      file_size: file.size,
      sort_order: nextOrder,
    });
    if (insertError) {
      // Don't leave an unlisted file behind.
      await supabase.storage.from(MAP_BUCKET).remove([path]);
      setBusy(false);
      return setError(insertError.message);
    }

    setBusy(false);
    setFile(null);
    setTitle("");
    setDescription("");
    setFileInputKey((k) => k + 1);
    router.refresh();
  }

  function startEdit(m: PlanMap) {
    setEditingId(m.id);
    setEditForm({ title: m.title, category: m.category ?? "", description: m.description ?? "" });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) return;
    setBusy(true);
    const { error: updateError } = await supabase
      .from("plan_maps")
      .update({
        title: editForm.title.trim(),
        category: editForm.category.trim() || null,
        description: editForm.description.trim() || null,
      })
      .eq("id", id);
    setBusy(false);
    if (updateError) return setError(updateError.message);
    setEditingId(null);
    router.refresh();
  }

  async function remove(m: PlanMap) {
    if (!confirm(`Delete "${m.title}"? Staff will no longer see it.`)) return;
    const { error: deleteError } = await supabase.from("plan_maps").delete().eq("id", m.id);
    if (deleteError) return setError(deleteError.message);
    // The listing is already gone; removing the file is best-effort cleanup.
    await supabase.storage.from(MAP_BUCKET).remove([m.file_path]);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = maps[index + direction];
    const current = maps[index];
    if (!target) return;
    setBusy(true);
    await Promise.all([
      supabase.from("plan_maps").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("plan_maps").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={handleUpload}
        className="space-y-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="map-file">
            Map file (PNG, JPG, WebP or PDF, up to {formatBytes(MAX_MAP_BYTES)})
          </label>
          <input
            key={fileInputKey}
            id="map-file"
            type="file"
            accept={MAP_ACCEPT}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Level 1 floor plan"
              className={`w-56 ${fieldClass}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Group</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="optional, e.g. Main Building"
              className={`w-52 ${fieldClass}`}
            />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label className={labelClass}>Note for staff</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
              className={fieldClass}
            />
          </div>
          <button type="submit" disabled={busy || !file || !title.trim()} className={primaryButton}>
            {busy ? "Uploading..." : "Upload map"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Staff save every map to their phone so it opens with no signal. Smaller files save faster — a clear image or
          PDF under 5 MB is plenty for a floor plan.
        </p>
      </form>

      <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
        {maps.map((m, index) =>
          editingId === m.id ? (
            <div key={m.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((v) => ({ ...v, title: e.target.value }))}
                className={`w-56 ${fieldClass}`}
              />
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((v) => ({ ...v, category: e.target.value }))}
                placeholder="Group"
                className={`w-44 ${fieldClass}`}
              />
              <input
                value={editForm.description}
                onChange={(e) => setEditForm((v) => ({ ...v, description: e.target.value }))}
                placeholder="Note for staff"
                className={`min-w-48 flex-1 ${fieldClass}`}
              />
              <button
                onClick={() => saveEdit(m.id)}
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
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {isPdf(m.content_type) || !previews[m.file_path] ? (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {isPdf(m.content_type) ? "PDF" : "IMG"}
                  </span>
                ) : (
                  // A short-lived preview address known only at runtime, so a plain <img>.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previews[m.file_path]}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-md border border-black/10 bg-white object-contain dark:border-white/10"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                    {m.title} {m.category && <span className="text-xs text-zinc-500">· {m.category}</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {[MAP_TYPES[m.content_type]?.label, formatBytes(m.file_size), m.description].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-xs text-zinc-500">
                <button onClick={() => move(index, -1)} disabled={index === 0 || busy} className="disabled:opacity-30">
                  ↑
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === maps.length - 1 || busy}
                  className="disabled:opacity-30"
                >
                  ↓
                </button>
                <button onClick={() => startEdit(m)}>Edit</button>
                <button onClick={() => remove(m)} className="text-red-600 dark:text-red-400">
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {maps.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">No maps yet.</p>}
      </div>

      {maps.length > 0 && (
        <p className="text-xs text-zinc-500">
          {maps.length} map{maps.length === 1 ? "" : "s"}, {formatBytes(totalBytes)} in total.
          {totalBytes > SOFT_TOTAL_BYTES && " That is a lot for staff phones to save — consider smaller files."}
        </p>
      )}
    </div>
  );
}
