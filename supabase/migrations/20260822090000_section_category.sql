-- Top-level home-screen category each section belongs to (Codes, ICS, Job
-- Action Sheets, POTS — see src/lib/categories.ts for the fixed list). Null
-- means uncategorized; the admin UI defaults new sections to 'codes' so this
-- should rarely happen in practice, but nothing at the DB level enforces it.
alter table public.plan_sections add column category text;
