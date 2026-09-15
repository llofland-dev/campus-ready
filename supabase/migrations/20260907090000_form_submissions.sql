-- Durable record of what staff actually submitted through a Form, independent
-- of whether the mailto: step that follows actually reaches anyone's inbox
-- (no default mail client configured, wrong account signed in, etc.). This
-- reverses the original "no submission storage" decision for Forms — that
-- was fine when Forms were low-stakes requests, but an Incident Report
-- losing its only copy to a misconfigured phone is a real problem.
create table public.form_submissions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  form_id     uuid not null references public.forms (id) on delete cascade,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index form_submissions_org_id_idx on public.form_submissions (org_id);
create index form_submissions_form_id_idx on public.form_submissions (form_id);

alter table public.form_submissions enable row level security;

-- Admin/content-editor read+delete, scoped to their own org — same shape as
-- every other admin-side table. Staff writes go through the service-role
-- client in the /api/form-submission route (gated by the signed session
-- cookie, not Supabase Auth), so no anon-role policy is needed here.
create policy form_submissions_all on public.form_submissions
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
