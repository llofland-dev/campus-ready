-- Auto-provision a public.profiles row on sign-up (mirrors the HICS project's
-- profile_provisioning migration), plus the self-serve org bootstrap RPC: the
-- first admin for a new client org creates it themselves at sign-up time,
-- since (unlike HICS's facilities) my-eop orgs are independent customers
-- with no pre-existing admin to assign them.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.eop_create_org_for_self(p_name text, p_org_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if public.current_org_id() is not null then
    raise exception 'user already belongs to an org';
  end if;

  insert into public.organizations (name, org_code) values (p_name, p_org_code)
  returning id into v_org_id;

  update public.profiles set org_id = v_org_id where id = auth.uid();

  return v_org_id;
end;
$$;

revoke all on function public.eop_create_org_for_self(text, text) from public;
grant execute on function public.eop_create_org_for_self(text, text) to authenticated;
