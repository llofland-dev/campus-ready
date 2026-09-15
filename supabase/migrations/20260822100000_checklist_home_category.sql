-- Lets a checklist (e.g. a Job Action Sheet, converted into a checklist)
-- appear under one of the fixed home-screen categories in
-- src/lib/categories.ts, alongside category-filtered plan_sections. Distinct
-- from the existing free-text `category` column, which is just a display
-- subtitle (e.g. "Incident Commander") on the flat Checklists list and isn't
-- tied to the home-screen category system at all.
alter table public.checklists add column home_category text;
