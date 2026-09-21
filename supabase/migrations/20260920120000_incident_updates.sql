-- Short, timestamped status messages staff post to an active incident for
-- families to read on the public, no-login status page (src/app/status/
-- [code]). Deliberately separate from checklist_events (that's an internal
-- evidence trail of checklist check-offs for After-Action Review) — this is
-- the human-written, parent-facing narrative: "Lockdown in effect since
-- 2:15pm", "All clear, pick-up at the usual location."
create table public.incident_updates (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  incident_id  uuid not null references public.incidents (id) on delete cascade,
  message      text not null,
  created_at   timestamptz not null default now()
);

create index incident_updates_incident_id_idx on public.incident_updates (incident_id);
create index incident_updates_org_id_idx on public.incident_updates (org_id);

-- ---------------------------------------------------------------------------
-- RLS: same "all for my own org" shape as incidents/checklist_events. The
-- public status page reads through the service-role admin client (like
-- every other public-facing read in this app — see src/lib/eop-org.ts), so
-- no anon policy is needed here.
-- ---------------------------------------------------------------------------
alter table public.incident_updates enable row level security;

create policy incident_updates_all on public.incident_updates
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
