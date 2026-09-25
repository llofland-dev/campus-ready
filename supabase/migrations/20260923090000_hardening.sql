-- Hardening pass ahead of the App Store / Google Play release. Independent of
-- the app code: nothing here is required for the current build to run, and
-- nothing in the current build breaks if this is applied before or after.

-- 1. Validate organization name and plan code in the database itself.
--    The signup form validates these, but eop_create_org_for_self is callable
--    directly by any signed-in user, so the form alone isn't a guarantee.
--    Codes are stored uppercase, 3-24 chars of A-Z 0-9 _ - (they end up in
--    URLs and are typed by staff on phones).
create or replace function public.eop_create_org_for_self(p_name text, p_org_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_code text := upper(btrim(coalesce(p_org_code, '')));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if public.current_org_id() is not null then
    raise exception 'user already belongs to an org';
  end if;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'organization name must be 1-100 characters';
  end if;

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,23}$' then
    raise exception 'plan code must be 3-24 letters, numbers, dashes, or underscores';
  end if;

  insert into public.organizations (name, org_code) values (v_name, v_code)
  returning id into v_org_id;

  update public.profiles set org_id = v_org_id where id = auth.uid();

  return v_org_id;
end;
$$;

-- 2. Plan codes are unique regardless of case, so "adventist" can never be
--    registered as a look-alike of "ADVENTIST".
create unique index if not exists organizations_org_code_upper_key
  on public.organizations (upper(org_code));

-- 3. Size and type limits on the two public upload buckets (org logos and
--    section icons). They load on every staff screen, often over cellular, and
--    the buckets are publicly readable — so they shouldn't accept arbitrary
--    files of arbitrary size. Existing files are unaffected.
update storage.buckets
set file_size_limit = 1048576,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id in ('org-logos', 'section-icons');
