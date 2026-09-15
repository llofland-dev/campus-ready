-- Storage bucket for org-uploaded section icons (e.g. a graphic per Code —
-- Code Red, Code Silver, etc.), shown next to that section's name in its
-- category list. Same shape as org-logos (20260824090000_org_logo_storage.sql):
-- public bucket since staff view /plan/[code] with no Supabase Auth session
-- at all, writes restricted to an authenticated admin uploading only into
-- their own org's folder (object path always starts with "<org_id>/").
insert into storage.buckets (id, name, public)
values ('section-icons', 'section-icons', true)
on conflict (id) do nothing;

create policy "section icons are publicly readable"
on storage.objects for select
using (bucket_id = 'section-icons');

create policy "admins upload their own org's section icons"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'section-icons'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins update their own org's section icons"
on storage.objects for update
to authenticated
using (
  bucket_id = 'section-icons'
  and (storage.foldername(name))[1] = public.current_org_id()::text
)
with check (
  bucket_id = 'section-icons'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins delete their own org's section icons"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'section-icons'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);
