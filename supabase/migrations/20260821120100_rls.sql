-- Row Level Security for the admin/content-editor side, plus the
-- security-definer RPCs that implement the public org-code + password gate.
--
-- Two distinct audiences, two distinct mechanisms:
--   - Org admins authenticate via Supabase Auth and get scoped read/write
--     access to their own org's content through ordinary RLS policies below.
--   - Field staff (the public /plan/[code] side) never get a Supabase Auth
--     session at all. They call the RPCs below through the anon key, and on
--     success the app issues its own signed session cookie
--     (src/lib/eop-session.ts). All public content reads then go through a
--     service-role client scoped explicitly to that cookie's org_id — see
--     src/lib/supabase/admin.ts — bypassing RLS by design, so there are
--     deliberately NO anon-role select policies on the content tables below.

-- ---------------------------------------------------------------------------
-- Helper: the calling (authenticated) user's own org id.
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs backing the org-code + password gate. security definer so
-- they can read organizations.access_password_hash without ever returning
-- it to the caller; granted to anon since field staff have no session.
-- ---------------------------------------------------------------------------
create or replace function public.eop_lookup_org(p_code text)
returns table (id uuid, name text, has_password boolean)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, (o.access_password_hash is not null)
  from public.organizations o
  where o.org_code = p_code;
$$;

revoke all on function public.eop_lookup_org(text) from public;
grant execute on function public.eop_lookup_org(text) to anon, authenticated;

create or replace function public.eop_verify_org_password(p_org_id uuid, p_password text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select o.access_password_hash = crypt(p_password, o.access_password_hash)
     from public.organizations o
     where o.id = p_org_id),
    false
  );
$$;

revoke all on function public.eop_verify_org_password(uuid, text) from public;
grant execute on function public.eop_verify_org_password(uuid, text) to anon, authenticated;

-- Admin-only: set or clear (pass null/empty) the calling admin's own org
-- password. Never exposes the hash — write-only from the client's view.
create or replace function public.eop_set_org_password(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if public.current_org_id() is null then
    raise exception 'no org for current user';
  end if;

  update public.organizations
  set access_password_hash = case
    when p_password is null or p_password = '' then null
    else crypt(p_password, gen_salt('bf'))
  end
  where id = public.current_org_id();
end;
$$;

revoke all on function public.eop_set_org_password(text) from public;
grant execute on function public.eop_set_org_password(text) to authenticated;

-- ---------------------------------------------------------------------------
-- organizations: an admin can read/update their own org, but never the
-- password hash column directly (only through eop_set_org_password above).
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

create policy organizations_update on public.organizations
  for update to authenticated
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

revoke update on public.organizations from authenticated;
grant update (name, org_code) on public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: a user can see/update their own profile only.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Content tables: standard "all for my own org" policy, admin side only.
-- ---------------------------------------------------------------------------
create policy plan_sections_all on public.plan_sections
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.plan_sections enable row level security;

create policy plan_pages_all on public.plan_pages
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.plan_pages enable row level security;

create policy contacts_all on public.contacts
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.contacts enable row level security;

create policy forms_all on public.forms
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.forms enable row level security;

create policy checklists_all on public.checklists
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.checklists enable row level security;

create policy checklist_items_all on public.checklist_items
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
alter table public.checklist_items enable row level security;
