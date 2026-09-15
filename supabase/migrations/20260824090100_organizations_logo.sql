-- Path (within the org-logos storage bucket) to this org's uploaded logo.
-- Null means "no custom logo yet" — every screen falls back to the
-- Campus Ready product logo. Also extend eop_lookup_org so the pre-verification
-- access-gate screen (which runs before any session exists, via the anon
-- key) can show the org's own logo too, not just its name.
alter table public.organizations add column logo_path text;

drop function public.eop_lookup_org(text);

create or replace function public.eop_lookup_org(p_code text)
returns table (id uuid, name text, has_password boolean, logo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, (o.access_password_hash is not null), o.logo_path
  from public.organizations o
  where o.org_code = p_code;
$$;

revoke all on function public.eop_lookup_org(text) from public;
grant execute on function public.eop_lookup_org(text) to anon, authenticated;
