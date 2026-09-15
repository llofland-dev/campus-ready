-- Path (within the section-icons storage bucket) to a section's uploaded
-- icon graphic. Null means "no icon" -- every category row falls back to
-- text-only, today's behavior unchanged.
alter table public.plan_sections add column icon_path text;
