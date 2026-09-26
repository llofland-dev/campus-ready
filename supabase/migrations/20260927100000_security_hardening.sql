-- Security hardening (2026-09-27), from the security audit. Safe to run once; idempotent where it can be.
--
-- 1. Guess throttling: a counters table + two functions, callable ONLY by the server (service role).
-- 2. The password check and org lookup are no longer callable with the public (anon) key — before this,
--    anyone with the public key and a plan code could guess passwords directly at Supabase, bypassing the app.
-- 3. Session revocation: a per-org counter that changes whenever a password/passphrase changes, so
--    existing sign-in cookies stop working immediately.
-- 4. Longer minimums (staff password 8, Facility Admin passphrase 10) enforced in the database, and a
--    stronger bcrypt work factor for newly set passwords.
-- 5. An org admin's browser can no longer read its own school's password hashes.
--
-- ORDER: the app code that goes with this is written to work before AND after this script, so deploy the
-- code first, then run this. (The reverse would break sign-in until the code is live.)

-- ---------------------------------------------------------------------------
-- 1. Rate limiting (server only)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket             text        not null,
  key                text        not null,   -- a keyed hash of the client's IP + the org, never the raw IP
  hits               integer     not null default 0,
  window_started_at  timestamptz not null default now(),
  primary key (bucket, key)
);
alter table public.rate_limits enable row level security;   -- no policies: only the service role can touch it
revoke all on public.rate_limits from anon, authenticated;

-- Read-only: has this key already used up its allowance in the current window?
create or replace function public.eop_rate_limit_check(p_bucket text, p_key text, p_limit integer, p_window_seconds integer)
returns table (blocked boolean, retry_after_seconds integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(r.hits >= p_limit and r.window_started_at > now() - make_interval(secs => p_window_seconds), false),
    coalesce(
      case when r.hits >= p_limit and r.window_started_at > now() - make_interval(secs => p_window_seconds)
           then greatest(1, ceil(extract(epoch from (r.window_started_at + make_interval(secs => p_window_seconds) - now())))::integer)
      end, 0)
  from (select 1) s
  left join public.rate_limits r on r.bucket = p_bucket and r.key = p_key;
$$;

-- Count one event. Returns blocked = true once the count in the window EXCEEDS the limit.
create or replace function public.eop_rate_limit_hit(p_bucket text, p_key text, p_limit integer, p_window_seconds integer)
returns table (blocked boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits  integer;
  v_start timestamptz;
begin
  if random() < 0.02 then
    delete from public.rate_limits where window_started_at < now() - interval '2 days';   -- housekeeping
  end if;

  insert into public.rate_limits as r (bucket, key, hits, window_started_at)
  values (p_bucket, p_key, 1, now())
  on conflict (bucket, key) do update set
    hits = case when r.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_started_at = case when r.window_started_at <= now() - make_interval(secs => p_window_seconds) then now() else r.window_started_at end
  returning r.hits, r.window_started_at into v_hits, v_start;

  return query select
    v_hits > p_limit,
    case when v_hits > p_limit
         then greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::integer)
         else 0 end;
end;
$$;

revoke all on function public.eop_rate_limit_check(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.eop_rate_limit_hit(text, text, integer, integer)   from public, anon, authenticated;
grant execute on function public.eop_rate_limit_check(text, text, integer, integer) to service_role;
grant execute on function public.eop_rate_limit_hit(text, text, integer, integer)   to service_role;

-- ---------------------------------------------------------------------------
-- 3. Session revocation counter
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists session_epoch integer not null default 0;

-- ---------------------------------------------------------------------------
-- 4. Password setters: minimum lengths, stronger hashing, and revoke existing sign-ins on change
-- ---------------------------------------------------------------------------
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
  if p_password is not null and p_password <> '' and length(p_password) < 8 then
    raise exception 'The staff password must be at least 8 characters.';
  end if;

  update public.organizations
  set access_password_hash = case
        when p_password is null or p_password = '' then null
        else crypt(p_password, gen_salt('bf', 10))
      end,
      session_epoch = session_epoch + 1   -- everyone signed in with the old password must sign in again
  where id = public.current_org_id();
end;
$$;

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
  if p_password is not null and p_password <> '' and length(p_password) < 10 then
    raise exception 'The Facility Admin passphrase must be at least 10 characters.';
  end if;

  update public.organizations
  set admin_password_hash = case
        when p_password is null or p_password = '' then null
        else crypt(p_password, gen_salt('bf', 10))
      end,
      session_epoch = session_epoch + 1
  where id = public.current_org_id();
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The password check and the org lookup are server-only from now on
-- ---------------------------------------------------------------------------
revoke execute on function public.eop_verify_org_password(uuid, text) from anon, authenticated;
revoke execute on function public.eop_lookup_org(text)               from anon, authenticated;
grant  execute on function public.eop_verify_org_password(uuid, text) to service_role;
grant  execute on function public.eop_lookup_org(text)               to service_role;

-- ---------------------------------------------------------------------------
-- 5. An org admin's browser must never read the password hashes (even its own school's)
-- ---------------------------------------------------------------------------
revoke select on public.organizations from authenticated;
grant  select (id, name, org_code, logo_path, active, created_at, session_epoch) on public.organizations to authenticated;
