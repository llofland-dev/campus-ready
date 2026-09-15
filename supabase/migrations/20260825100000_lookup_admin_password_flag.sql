-- eop_lookup_org needs to tell the client whether an admin-tier passphrase
-- exists at all, separate from has_password (which only reflects the base
-- password and controls whether the field is *required*). Without this, an
-- org with only an admin passphrase configured (no base password) never
-- shows a password field at all, so there'd be no way to type the
-- passphrase in.
drop function public.eop_lookup_org(text);

create or replace function public.eop_lookup_org(p_code text)
returns table (id uuid, name text, has_password boolean, has_admin_password boolean, logo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, (o.access_password_hash is not null), (o.admin_password_hash is not null), o.logo_path
  from public.organizations o
  where o.org_code = p_code;
$$;

revoke all on function public.eop_lookup_org(text) from public;
grant execute on function public.eop_lookup_org(text) to anon, authenticated;
