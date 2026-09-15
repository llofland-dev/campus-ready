-- Incident-scoped checklist activity log. Captures a timestamped evidence
-- trail (who checked what, when) while staff work through checklists during
-- a real event, for a school's own After-Action Review afterward. This is
-- deliberately NOT an AAR itself — it's the raw log a director reads to
-- write one.
--
-- At most one active incident per org: if five staff independently open the
-- same checklist during one real event, their check-offs must all land on
-- one shared timeline, not five disconnected ones. Enforced by a partial
-- unique index rather than app-level logic alone.
create table public.incidents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  name         text not null,
  status       text not null default 'active' check (status in ('active', 'closed')),
  started_at   timestamptz not null default now(),
  closed_at    timestamptz
);

create index incidents_org_id_idx on public.incidents (org_id);

create unique index incidents_one_active_per_org
  on public.incidents (org_id)
  where status = 'active';

create table public.checklist_events (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  incident_id        uuid references public.incidents (id) on delete set null,
  checklist_id       uuid not null references public.checklists (id) on delete cascade,
  checklist_item_id  uuid not null references public.checklist_items (id) on delete cascade,
  item_text          text not null,
  action             text not null check (action in ('checked', 'unchecked')),
  actor_name         text,
  created_at         timestamptz not null default now()
);

create index checklist_events_incident_id_idx on public.checklist_events (incident_id);
create index checklist_events_org_id_idx on public.checklist_events (org_id);

-- ---------------------------------------------------------------------------
-- RLS: same "all for my own org" shape as every other content table
-- (20260821120100_rls.sql). Public writes (the staff check-off POST) go
-- through the service-role client scoped by the signed session cookie, same
-- as every other public write in this app — no anon policy needed here.
-- ---------------------------------------------------------------------------
alter table public.incidents enable row level security;

create policy incidents_all on public.incidents
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

alter table public.checklist_events enable row level security;

create policy checklist_events_all on public.checklist_events
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
