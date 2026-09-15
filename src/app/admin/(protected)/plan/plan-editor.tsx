"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanPage, PlanSection } from "@/lib/supabase/types";
import { colorForSection, PALETTE } from "@/lib/palette";
import { CATEGORIES } from "@/lib/categories";
import { Markdown } from "@/components/markdown";

const fieldClass =
  "w-full rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

export function PlanEditor({
  orgId,
  sections,
  pages,
}: {
  orgId: string;
  sections: PlanSection[];
  pages: PlanPage[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    sections[0]?.id ?? null
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionColor, setNewSectionColor] = useState("");
  const [newSectionCategory, setNewSectionCategory] = useState(CATEGORIES[0].key);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [editingSectionColor, setEditingSectionColor] = useState("");
  const [editingSectionCategory, setEditingSectionCategory] = useState(CATEGORIES[0].key);
  const [uploadingIconId, setUploadingIconId] = useState<string | null>(null);

  const [newPage, setNewPage] = useState({ title: "", body: "" });
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState({ title: "", body: "" });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;
  const sectionPages = pages
    .filter((p) => p.section_id === selectedSectionId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setBusy(true);
    setError(null);

    const nextOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from("plan_sections")
      .insert({
        org_id: orgId,
        title: newSectionTitle.trim(),
        color_key: newSectionColor || null,
        category: newSectionCategory,
        sort_order: nextOrder,
      })
      .select("id")
      .single();

    setBusy(false);
    if (error) return setError(error.message);

    setNewSectionTitle("");
    setNewSectionColor("");
    setNewSectionCategory(CATEGORIES[0].key);
    setSelectedSectionId(data.id);
    router.refresh();
  }

  async function renameSection(id: string) {
    if (!editingSectionTitle.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("plan_sections")
      .update({
        title: editingSectionTitle.trim(),
        color_key: editingSectionColor || null,
        category: editingSectionCategory,
      })
      .eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    setEditingSectionId(null);
    router.refresh();
  }

  function handleIconChange(section: PlanSection) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setUploadingIconId(section.id);
      setError(null);

      const ext = file.name.split(".").pop() || "png";
      // Unique filename per upload so the public URL changes and no screen
      // serves a browser-cached copy of the old icon at the same URL.
      const path = `${orgId}/${section.id}/icon-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("section-icons")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setUploadingIconId(null);
        setError(uploadError.message);
        return;
      }

      const { error } = await supabase.from("plan_sections").update({ icon_path: path }).eq("id", section.id);

      setUploadingIconId(null);
      if (error) return setError(error.message);
      router.refresh();
    };
  }

  async function deleteSection(section: PlanSection) {
    if (!confirm(`Delete "${section.title}" and all its pages?`)) return;
    const { error } = await supabase.from("plan_sections").delete().eq("id", section.id);
    if (error) return setError(error.message);
    if (selectedSectionId === section.id) setSelectedSectionId(null);
    router.refresh();
  }

  async function moveSection(index: number, direction: -1 | 1) {
    const target = sections[index + direction];
    const current = sections[index];
    if (!target) return;
    setBusy(true);
    await Promise.all([
      supabase.from("plan_sections").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("plan_sections").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    setBusy(false);
    router.refresh();
  }

  async function addPage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSectionId || !newPage.title.trim()) return;
    setBusy(true);
    setError(null);

    const nextOrder = sectionPages.reduce((max, p) => Math.max(max, p.sort_order), 0) + 1;
    const { error } = await supabase.from("plan_pages").insert({
      org_id: orgId,
      section_id: selectedSectionId,
      title: newPage.title.trim(),
      body: newPage.body,
      sort_order: nextOrder,
    });

    setBusy(false);
    if (error) return setError(error.message);

    setNewPage({ title: "", body: "" });
    router.refresh();
  }

  async function savePage(id: string) {
    if (!editingPage.title.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("plan_pages")
      .update({ title: editingPage.title.trim(), body: editingPage.body, updated_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    setEditingPageId(null);
    router.refresh();
  }

  async function deletePage(page: PlanPage) {
    if (!confirm(`Delete "${page.title}"?`)) return;
    const { error } = await supabase.from("plan_pages").delete().eq("id", page.id);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function movePage(index: number, direction: -1 | 1) {
    const target = sectionPages[index + direction];
    const current = sectionPages[index];
    if (!target) return;
    setBusy(true);
    await Promise.all([
      supabase.from("plan_pages").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("plan_pages").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sections</h3>
        <div className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
          {sections.map((section, index) => (
            <div key={section.id} className="px-3 py-2">
              {editingSectionId === section.id ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    value={editingSectionTitle}
                    onChange={(e) => setEditingSectionTitle(e.target.value)}
                    className={fieldClass}
                    autoFocus
                  />
                  <select
                    value={editingSectionColor}
                    onChange={(e) => setEditingSectionColor(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Auto color</option>
                    {PALETTE.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editingSectionCategory}
                    onChange={(e) => setEditingSectionCategory(e.target.value)}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    {section.icon_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={supabase.storage.from("section-icons").getPublicUrl(section.icon_path).data.publicUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-contain"
                      />
                    )}
                    <label className="cursor-pointer rounded-md border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                      {uploadingIconId === section.id
                        ? "Uploading..."
                        : section.icon_path
                          ? "Replace icon"
                          : "Upload icon"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconChange(section)}
                        disabled={uploadingIconId === section.id}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => renameSection(section.id)}
                      disabled={busy}
                      className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSectionId(null)}
                      className="rounded-md border border-black/10 px-2 py-1 text-xs dark:border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => setSelectedSectionId(section.id)}
                    className={`flex min-w-0 items-center gap-1.5 truncate text-left text-sm ${
                      selectedSectionId === section.id
                        ? "font-medium text-black dark:text-zinc-50"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorForSection(section, index).button}`}
                      aria-hidden
                    />
                    <span className="truncate">{section.title}</span>
                  </button>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0 || busy}
                      className="px-1 text-xs text-zinc-500 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1 || busy}
                      className="px-1 text-xs text-zinc-500 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setEditingSectionTitle(section.title);
                        setEditingSectionColor(section.color_key ?? "");
                        setEditingSectionCategory(section.category ?? CATEGORIES[0].key);
                      }}
                      className="px-1 text-xs text-zinc-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSection(section)}
                      className="px-1 text-xs text-red-600 dark:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {sections.length === 0 && (
            <p className="px-3 py-2 text-sm text-zinc-500">No sections yet.</p>
          )}
        </div>

        <form onSubmit={addSection} className="space-y-1.5">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="New section title"
            className={fieldClass}
          />
          <select
            value={newSectionColor}
            onChange={(e) => setNewSectionColor(e.target.value)}
            className={fieldClass}
          >
            <option value="">Auto color</option>
            {PALETTE.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={newSectionCategory}
            onChange={(e) => setNewSectionCategory(e.target.value)}
            className={fieldClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Add section
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!selectedSection ? (
          <p className="text-sm text-zinc-500">Select or create a section to add pages.</p>
        ) : (
          <>
            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Pages in &quot;{selectedSection.title}&quot;
            </h3>

            <div className="space-y-3">
              {sectionPages.map((page, index) =>
                editingPageId === page.id ? (
                  <div
                    key={page.id}
                    className="space-y-2 rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-950"
                  >
                    <input
                      value={editingPage.title}
                      onChange={(e) => setEditingPage((v) => ({ ...v, title: e.target.value }))}
                      className={fieldClass}
                    />
                    <textarea
                      value={editingPage.body}
                      onChange={(e) => setEditingPage((v) => ({ ...v, body: e.target.value }))}
                      rows={5}
                      className={fieldClass}
                    />
                    <p className="text-xs text-zinc-500">
                      Markdown supported: **bold**, *italic*, - lists, 1. numbered, | tables |
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => savePage(page.id)}
                        disabled={busy}
                        className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPageId(null)}
                        className="rounded-md border border-black/10 px-3 py-1 text-xs dark:border-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={page.id}
                    className="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-black dark:text-zinc-50">{page.title}</h4>
                      <div className="flex shrink-0 gap-1 text-xs text-zinc-500">
                        <button
                          onClick={() => movePage(index, -1)}
                          disabled={index === 0 || busy}
                          className="disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePage(index, 1)}
                          disabled={index === sectionPages.length - 1 || busy}
                          className="disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => {
                            setEditingPageId(page.id);
                            setEditingPage({ title: page.title, body: page.body });
                          }}
                        >
                          Edit
                        </button>
                        <button onClick={() => deletePage(page)} className="text-red-600 dark:text-red-400">
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <Markdown>{page.body}</Markdown>
                    </div>
                  </div>
                )
              )}
              {sectionPages.length === 0 && (
                <p className="text-sm text-zinc-500">No pages in this section yet.</p>
              )}
            </div>

            <form
              onSubmit={addPage}
              className="space-y-2 rounded-lg border border-dashed border-black/20 p-3 dark:border-white/20"
            >
              <input
                value={newPage.title}
                onChange={(e) => setNewPage((v) => ({ ...v, title: e.target.value }))}
                placeholder="Page title"
                className={fieldClass}
              />
              <textarea
                value={newPage.body}
                onChange={(e) => setNewPage((v) => ({ ...v, body: e.target.value }))}
                placeholder="Page content"
                rows={4}
                className={fieldClass}
              />
              <p className="text-xs text-zinc-500">
                Markdown supported: **bold**, *italic*, - lists, 1. numbered, | tables |
              </p>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              >
                Add page
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
