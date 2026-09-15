-- Second nesting level under a home-screen category (e.g. HICS -> "Job
-- Action Sheets" -> the 4 role checklists), requested after the user
-- clarified Job Action Sheets should sit inside an "HICS" tile rather than
-- be its own top-level tile. Free text (not a fixed list like categories in
-- src/lib/categories.ts) since the user expects to add more HICS sub-groups
-- ad hoc (e.g. "Role Responsibilities"). Null means "show directly in the
-- category list, no sub-grouping" — the existing behavior for everything
-- that doesn't need this.
alter table public.plan_sections add column subcategory text;
alter table public.checklists add column subcategory text;
