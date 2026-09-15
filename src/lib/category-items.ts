import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checklist, PlanSection } from "@/lib/supabase/types";
import { colorForIndex, colorForSection, type PaletteColor } from "@/lib/palette";

// Merges plan_sections and checklists that belong to one home-screen
// category (and, optionally, one subcategory within it) into a single
// list of navigable rows — the two content types share this list/tile UI
// even though they live in different tables.
export interface CategoryItem {
  key: string;
  href: string;
  label: string;
  sublabel: string | null;
  iconUrl: string | null;
  color: PaletteColor;
}

// Narrow, generic-free shape so this works with both the anon client and
// the service-role admin client — their full SupabaseClient<...> generic
// signatures don't unify, but getPublicUrl is a pure string builder that
// doesn't care which client instance calls it. Same pattern as orgLogoUrl
// in src/lib/eop-org.ts.
type StorageOnly = { storage: { from: (bucket: string) => { getPublicUrl: (path: string) => { data: { publicUrl: string } } } } };

function sectionIconUrl(supabase: StorageOnly, iconPath: string | null): string | null {
  if (!iconPath) return null;
  return supabase.storage.from("section-icons").getPublicUrl(iconPath).data.publicUrl;
}

export async function fetchCategoryContent(
  admin: SupabaseClient,
  orgId: string,
  categoryKey: string
) {
  const [{ data: allSections }, { data: allChecklists }] = await Promise.all([
    admin
      .from("plan_sections")
      .select("id, org_id, title, color_key, icon_path, category, subcategory, sort_order, created_at")
      .eq("org_id", orgId)
      .order("sort_order")
      .returns<PlanSection[]>(),
    admin
      .from("checklists")
      .select("id, org_id, title, category, home_category, subcategory, sort_order, created_at")
      .eq("org_id", orgId)
      .order("sort_order")
      .returns<Checklist[]>(),
  ]);

  const sections = (allSections ?? []).filter((s) => s.category === categoryKey);
  const checklists = (allChecklists ?? []).filter((c) => c.home_category === categoryKey);

  return { allSections: allSections ?? [], sections, checklists };
}

// Top-level view of a category: items with no subcategory show directly;
// items sharing a subcategory collapse into one group entry that links into
// the subcategory route instead of the item itself.
export function buildCategoryTopItems(
  code: string,
  categoryKey: string,
  allSections: PlanSection[],
  sections: PlanSection[],
  checklists: Checklist[],
  supabase?: StorageOnly
): CategoryItem[] {
  const items: CategoryItem[] = [];
  const groupLabels: string[] = [];

  for (const section of sections) {
    if (section.subcategory) {
      if (!groupLabels.includes(section.subcategory)) groupLabels.push(section.subcategory);
      continue;
    }
    const index = allSections.findIndex((s) => s.id === section.id);
    items.push({
      key: `section-${section.id}`,
      href: `/plan/${code}/sections/${section.id}`,
      label: section.title,
      sublabel: null,
      iconUrl: supabase ? sectionIconUrl(supabase, section.icon_path) : null,
      color: colorForSection(section, index),
    });
  }

  for (const checklist of checklists) {
    if (checklist.subcategory) {
      if (!groupLabels.includes(checklist.subcategory)) groupLabels.push(checklist.subcategory);
      continue;
    }
    items.push({
      key: `checklist-${checklist.id}`,
      href: `/plan/${code}/checklists/${checklist.id}`,
      label: checklist.title,
      sublabel: checklist.category,
      iconUrl: null,
      color: colorForIndex(items.length),
    });
  }

  for (const label of groupLabels) {
    items.push({
      key: `group-${label}`,
      href: `/plan/${code}/categories/${categoryKey}/${encodeURIComponent(label)}`,
      label,
      sublabel: null,
      iconUrl: null,
      color: colorForIndex(items.length),
    });
  }

  return items;
}

// One subcategory's items — always shown directly, no further nesting.
export function buildSubcategoryItems(
  code: string,
  allSections: PlanSection[],
  sections: PlanSection[],
  checklists: Checklist[],
  subcategory: string,
  supabase?: StorageOnly
): CategoryItem[] {
  const items: CategoryItem[] = [];

  for (const section of sections.filter((s) => s.subcategory === subcategory)) {
    const index = allSections.findIndex((s) => s.id === section.id);
    items.push({
      key: `section-${section.id}`,
      href: `/plan/${code}/sections/${section.id}`,
      label: section.title,
      sublabel: null,
      iconUrl: supabase ? sectionIconUrl(supabase, section.icon_path) : null,
      color: colorForSection(section, index),
    });
  }

  for (const checklist of checklists.filter((c) => c.subcategory === subcategory)) {
    items.push({
      key: `checklist-${checklist.id}`,
      href: `/plan/${code}/checklists/${checklist.id}`,
      label: checklist.title,
      sublabel: checklist.category,
      iconUrl: null,
      color: colorForIndex(items.length),
    });
  }

  return items;
}

// Where a category page's own "Back" link should point. A category with
// exactly one top-level item redirects straight through it (see the
// category route) — so pointing back at the category itself would just
// bounce back to wherever the visitor already is. Skip straight to Home in
// that case instead.
export function categoryBackHref(
  code: string,
  categoryKey: string,
  allSections: PlanSection[],
  sections: PlanSection[],
  checklists: Checklist[]
): string {
  const items = buildCategoryTopItems(code, categoryKey, allSections, sections, checklists);
  return items.length === 1 ? `/plan/${code}` : `/plan/${code}/categories/${categoryKey}`;
}

// Where a section/checklist's own "Back" link should point, given its
// category and (optional) subcategory. Same reasoning as categoryBackHref,
// applied one level at a time: if this item is the only one in its
// subcategory, going back to that subcategory list would just redirect
// straight back here, so skip to wherever the subcategory's own back
// would resolve to instead (which itself may skip the category too).
export function leafBackHref(
  code: string,
  category: string | null,
  subcategory: string | null,
  allSections: PlanSection[],
  categorySections: PlanSection[],
  categoryChecklists: Checklist[]
): string {
  if (!category) return `/plan/${code}`;

  if (subcategory) {
    const subItems = buildSubcategoryItems(code, allSections, categorySections, categoryChecklists, subcategory);
    if (subItems.length > 1) {
      return `/plan/${code}/categories/${category}/${encodeURIComponent(subcategory)}`;
    }
  }

  return categoryBackHref(code, category, allSections, categorySections, categoryChecklists);
}
