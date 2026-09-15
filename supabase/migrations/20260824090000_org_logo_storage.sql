-- Storage bucket for org-uploaded logos, shown across that org's public
-- screens and admin dashboard once uploaded (see the logo_path column added
-- in the next migration). Public bucket — every logo must be readable
-- without auth, since staff view the public /plan/[code] side with no
-- Supabase Auth session at all. Writes are restricted to an authenticated
-- admin uploading only into their own org's folder (object path always
-- starts with "<org_id>/").
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy "org logos are publicly readable"
on storage.objects for select
using (bucket_id = 'org-logos');

create policy "admins upload their own org logo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins update their own org logo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_org_id()::text
)
with check (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins delete their own org logo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);
