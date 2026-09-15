-- Backlog item 3 (AOC): every source doc references calling the
-- Administrator-on-Call, so the most useful thing is fast access to
-- whichever contact matters most right now — not a full on-call rotation
-- schedule, which nobody asked for. A generic "pinned" flag (rather than a
-- magic "AOC" category string) lets an org feature any contact — AOC today,
-- something else if their needs change — on the plan's home screen.
alter table public.contacts add column pinned boolean not null default false;
