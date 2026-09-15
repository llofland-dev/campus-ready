-- Lets Larry manually cut off a non-paying organization's access without
-- deleting its data. No billing/Stripe integration here -- just a column he
-- flips directly in Supabase Studio's table editor when an invoice goes
-- unpaid, enforced at both the field-staff gate (api/verify) and the admin
-- panel (admin layout).
alter table public.organizations add column active boolean not null default true;

drop function public.eop_lookup_org(text);

create or replace function public.eop_lookup_org(p_code text)
returns table (id uuid, name text, has_password boolean, has_admin_password boolean, logo_path text, active boolean)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, (o.access_password_hash is not null), (o.admin_password_hash is not null), o.logo_path, o.active
  from public.organizations o
  where o.org_code = p_code;
$$;

revoke all on function public.eop_lookup_org(text) from public;
grant execute on function public.eop_lookup_org(text) to anon, authenticated;
