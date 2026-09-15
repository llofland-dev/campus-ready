-- A checklist's mission/purpose statement (e.g. a Job Action Sheet's
-- "Mission:" line) is a statement, not an action — it shouldn't render as a
-- checkbox item. Gives checklists a dedicated place for that text, shown
-- above the checkable items instead of mixed into them.
alter table public.checklists add column description text;
