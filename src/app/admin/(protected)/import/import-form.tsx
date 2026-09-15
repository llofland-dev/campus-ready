"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Checklist, PlanSection } from "@/lib/supabase/types";
import { PALETTE } from "@/lib/palette";
import { CATEGORIES } from "@/lib/categories";

type SectionDraft = { title: string; pages: { title: string; body: string }[] };
type ChecklistDraft = { title: string; items: string[] };

const fieldClass =
  "w-full rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

export function ImportForm({
  orgId,
  sections,
  checklists,
}: {
  orgId: string;
  sections: PlanSection[];
  checklists: Checklist[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [targetType, setTargetType] = useState<"section" | "checklist">("section");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sectionDraft, setSectionDraft] = useState<SectionDraft | null>(null);
  const [sectionColor, setSectionColor] = useState("");
  const [sectionCategory, setSectionCategory] = useState(CATEGORIES[0].key);
  const [sectionSubcategory, setSectionSubcategory] = useState("");
  // "new" creates a section; any other value is the id of an existing
  // section to append these pages to instead.
  const [sectionTarget, setSectionTarget] = useState<string>("new");

  const [checklistDraft, setChecklistDraft] = useState<ChecklistDraft | null>(null);
  const [checklistItemsText, setChecklistItemsText] = useState("");
  const [checklistDescription, setChecklistDescription] = useState("");
  const [checklistCategory, setChecklistCategory] = useState("");
  const [checklistHomeCategory, setChecklistHomeCategory] = useState("");
  const [checklistSubcategory, setChecklistSubcategory] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fileInput = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetType", targetType);

    const res = await fetch("/api/admin/import-document", { method: "POST", body: formData });
    const body = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(body.error ?? "Couldn't parse that file.");
      return;
    }

    if (targetType === "section") {
      setSectionDraft(body.draft as SectionDraft);
    } else {
      const draft = body.draft as ChecklistDraft;
      setChecklistDraft(draft);
      setChecklistItemsText(draft.items.join("\n"));
    }
  }

  async function publishSection() {
    if (!sectionDraft) return;
    setPublishing(true);
    setError(null);

    let sectionId = sectionTarget;
    let startOrder = 1;

    if (sectionTarget === "new") {
      const nextSectionOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;
      const { data: newSection, error: sectionError } = await supabase
        .from("plan_sections")
        .insert({
          org_id: orgId,
          title: sectionDraft.title,
          color_key: sectionColor || null,
          category: sectionCategory,
          subcategory: sectionSubcategory.trim() || null,
          sort_order: nextSectionOrder,
        })
        .select("id")
        .single();

      if (sectionError || !newSection) {
        setPublishing(false);
        setError(sectionError?.message ?? "Couldn't create the section.");
        return;
      }
      sectionId = newSection.id;
    } else {
      const { data: existingPages } = await supabase
        .from("plan_pages")
        .select("sort_order")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: false })
        .limit(1);
      startOrder = (existingPages?.[0]?.sort_order ?? 0) + 1;
    }

    const pageRows = sectionDraft.pages.map((page, i) => ({
      org_id: orgId,
      section_id: sectionId,
      title: page.title,
      body: page.body,
      sort_order: startOrder + i,
    }));

    const { error: pagesError } = await supabase.from("plan_pages").insert(pageRows);
    setPublishing(false);

    if (pagesError) {
      setError(pagesError.message);
      return;
    }

    router.push("/admin/plan");
  }

  async function publishChecklist() {
    if (!checklistDraft) return;
    setPublishing(true);
    setError(null);

    const items = checklistItemsText.split("\n").map((line) => line.trim()).filter(Boolean);
    const nextOrder = checklists.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;

    const { data: newChecklist, error: checklistError } = await supabase
      .from("checklists")
      .insert({
        org_id: orgId,
        title: checklistDraft.title,
        description: checklistDescription.trim() || null,
        category: checklistCategory.trim() || null,
        home_category: checklistHomeCategory || null,
        subcategory: checklistSubcategory.trim() || null,
        sort_order: nextOrder,
      })
      .select("id")
      .single();

    if (checklistError || !newChecklist) {
      setPublishing(false);
      setError(checklistError?.message ?? "Couldn't create the checklist.");
      return;
    }

    const itemRows = items.map((text, i) => ({
      org_id: orgId,
      checklist_id: newChecklist.id,
      text,
      sort_order: i + 1,
    }));

    const { error: itemsError } = await supabase.from("checklist_items").insert(itemRows);
    setPublishing(false);

    if (itemsError) {
      setError(itemsError.message);
      return;
    }

    router.push("/admin/checklists");
  }

  const hasDraft = sectionDraft || checklistDraft;

  return (
    <div className="max-w-2xl space-y-6">
      {!hasDraft && (
        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-lg border border-dashed border-black/20 p-4 dark:border-white/20"
        >
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="targetType"
                checked={targetType === "section"}
                onChange={() => setTargetType("section")}
              />
              Plan section (reference content)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="targetType"
                checked={targetType === "checklist"}
                onChange={() => setTargetType("checklist")}
              />
              Checklist
            </label>
          </div>

          <input type="file" name="file" accept=".docx,.xlsx,.pdf" required className={fieldClass} />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {uploading ? "Parsing..." : "Upload & parse"}
          </button>
        </form>
      )}

      {sectionDraft && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Review before publishing — nothing is live yet
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Add these page(s) to</label>
            <select value={sectionTarget} onChange={(e) => setSectionTarget(e.target.value)} className={fieldClass}>
              <option value="new">A new section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Existing: {s.title}
                </option>
              ))}
            </select>
          </div>

          {sectionTarget === "new" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Section title</label>
                <input
                  value={sectionDraft.title}
                  onChange={(e) => setSectionDraft({ ...sectionDraft, title: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Category</label>
                  <select value={sectionCategory} onChange={(e) => setSectionCategory(e.target.value)} className={fieldClass}>
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Subcategory (optional)</label>
                  <input
                    value={sectionSubcategory}
                    onChange={(e) => setSectionSubcategory(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Color</label>
                  <select value={sectionColor} onChange={(e) => setSectionColor(e.target.value)} className={fieldClass}>
                    <option value="">Auto color</option>
                    {PALETTE.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Pages ({sectionDraft.pages.length})
            </h4>
            {sectionDraft.pages.map((page, i) => (
              <div key={i} className="space-y-2 rounded-md border border-black/10 p-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    value={page.title}
                    onChange={(e) => {
                      const pages = [...sectionDraft.pages];
                      pages[i] = { ...pages[i], title: e.target.value };
                      setSectionDraft({ ...sectionDraft, pages });
                    }}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const pages = sectionDraft.pages.filter((_, idx) => idx !== i);
                      setSectionDraft({ ...sectionDraft, pages });
                    }}
                    className="shrink-0 text-xs text-red-600 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={page.body}
                  onChange={(e) => {
                    const pages = [...sectionDraft.pages];
                    pages[i] = { ...pages[i], body: e.target.value };
                    setSectionDraft({ ...sectionDraft, pages });
                  }}
                  rows={8}
                  className={`${fieldClass} font-mono text-xs`}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={publishSection}
              disabled={publishing}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {publishing ? "Publishing..." : "Publish section"}
            </button>
            <button
              onClick={() => setSectionDraft(null)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {checklistDraft && (
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Review before publishing — nothing is live yet
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Checklist title</label>
            <input
              value={checklistDraft.title}
              onChange={(e) => setChecklistDraft({ ...checklistDraft, title: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Description (shown above items, optional)
            </label>
            <textarea
              value={checklistDescription}
              onChange={(e) => setChecklistDescription(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Subtitle (optional)</label>
              <input
                value={checklistCategory}
                onChange={(e) => setChecklistCategory(e.target.value)}
                placeholder="e.g. a role name"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Home tile</label>
              <select
                value={checklistHomeCategory}
                onChange={(e) => setChecklistHomeCategory(e.target.value)}
                className={fieldClass}
              >
                <option value="">Checklists list only</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Sub-group (optional)</label>
              <input
                value={checklistSubcategory}
                onChange={(e) => setChecklistSubcategory(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Items — one per line, in order
            </label>
            <textarea
              value={checklistItemsText}
              onChange={(e) => setChecklistItemsText(e.target.value)}
              rows={16}
              className={`${fieldClass} font-mono text-xs`}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={publishChecklist}
              disabled={publishing}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {publishing ? "Publishing..." : "Publish checklist"}
            </button>
            <button
              onClick={() => setChecklistDraft(null)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
