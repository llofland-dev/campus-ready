-- Per-Code section colors (e.g. Code Red = red, Code Pink = pink) are a real
-- hospital convention, not something an auto-cycled palette can represent.
-- Null means "auto-cycle by list position", preserving existing behavior for
-- sections that don't set one.
alter table public.plan_sections add column color_key text;
