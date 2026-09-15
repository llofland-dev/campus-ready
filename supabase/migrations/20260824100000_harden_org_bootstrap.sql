-- eop_create_org_for_self only checked "does this user already have an
-- org" (current_org_id() is not null) — it never checked that there was a
-- real authenticated caller at all. Since Supabase's JS client always sends
-- *some* Authorization header (falling back to the anon key when there's
-- no session — e.g. right after signup, before email confirmation), a call
-- made with no session still reaches this function, auth.uid() resolves to
-- null, the "already has an org" check trivially passes (null is not "not
-- null"), and the function creates a real organization row while its
-- `update profiles set org_id = ... where id = auth.uid()` silently
-- matches zero rows — an orphaned org, unreachable by anyone, and the
-- caller gets back a success value with no indication anything went wrong.
create or replace function public.eop_create_org_for_self(p_name text, p_org_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if public.current_org_id() is not null then
    raise exception 'user already belongs to an org';
  end if;

  insert into public.organizations (name, org_code) values (p_name, p_org_code)
  returning id into v_org_id;

  update public.profiles set org_id = v_org_id where id = auth.uid();

  return v_org_id;
end;
$$;
