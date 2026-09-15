-- Facility Admin tier: a second, independent passphrase that unlocks
-- command-level content (HICS/JAS) and light contact-editing rights for
-- whoever's handed it, without a real login — matches the existing
-- no-account, fast-access design for the public /plan side (see
-- src/lib/eop-session.ts). Null means this org has no elevated tier
-- configured yet.
alter table public.organizations add column admin_password_hash text;

-- eop_verify_org_password now reports WHICH tier the password matched
-- ('user' | 'admin') instead of a bare boolean, so the caller can embed
-- that tier in the signed session cookie. Checking admin_password_hash
-- first means an admin-tier password also satisfies a base 'user' gate.
drop function public.eop_verify_org_password(uuid, text);

create or replace function public.eop_verify_org_password(p_org_id uuid, p_password text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case
    when o.admin_password_hash is not null and o.admin_password_hash = crypt(p_password, o.admin_password_hash) then 'admin'
    when o.access_password_hash is not null and o.access_password_hash = crypt(p_password, o.access_password_hash) then 'user'
    else null
  end
  from public.organizations o
  where o.id = p_org_id;
$$;

revoke all on function public.eop_verify_org_password(uuid, text) from public;
grant execute on function public.eop_verify_org_password(uuid, text) to anon, authenticated;

-- Sets/clears the org's elevated (Facility Admin) passphrase — same
-- write-only pattern as eop_set_org_password.
create or replace function public.eop_set_org_admin_password(p_password text)
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
  set admin_password_hash = case
    when p_password is null or p_password = '' then null
    else crypt(p_password, gen_salt('bf'))
  end
  where id = public.current_org_id();
end;
$$;

revoke all on function public.eop_set_org_admin_password(text) from public;
grant execute on function public.eop_set_org_admin_password(text) to authenticated;
