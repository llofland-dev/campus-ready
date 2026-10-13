-- Maps: floor plans, campus maps, evacuation routes and the like, uploaded by an org's admin and
-- shown to staff on a "Maps" tile.
--
-- Floor plans and evacuation routes are sensitive, so unlike logos and section icons these files are
-- NOT in a public bucket. The bucket is private; staff reach a file only through the plan's own
-- /plan/[code]/maps/[id]/file route, which checks the signed plan session first (the same gate as
-- every other plan page). Admins upload straight from their browser into their own org's folder
-- (object path always starts with "<org_id>/"), the same way logos are uploaded.

-- ---------------------------------------------------------------------------
-- The list of maps (one row per uploaded file).
-- ---------------------------------------------------------------------------
create table public.plan_maps (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  title         text not null,
  description   text,
  -- Optional grouping label shown as a heading on the staff list (e.g. "Main Hospital"), like
  -- a contact's category.
  category      text,
  -- Object path inside the org-maps bucket: "<org_id>/<uuid>.<ext>".
  file_path     text not null,
  content_type  text not null,
  file_size     integer not null default 0,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index plan_maps_org_id_idx on public.plan_maps (org_id);

alter table public.plan_maps enable row level security;

-- Admin side only, scoped to their own org — same shape as every other content table. Staff reads go
-- through the service-role client behind the signed session cookie, so no anon policy exists.
create policy plan_maps_all on public.plan_maps
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

revoke all on public.plan_maps from anon;

-- ---------------------------------------------------------------------------
-- The private bucket. 10 MB per file, and only images and PDFs (no SVG: an SVG can carry script).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-maps',
  'org-maps',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- An authenticated admin can see, add, replace and remove files only inside their own org's folder.
-- (No policy for anon: a private bucket is invisible to the public key.)
create policy "admins read their own org's maps"
on storage.objects for select
to authenticated
using (
  bucket_id = 'org-maps'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins upload their own org's maps"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'org-maps'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins update their own org's maps"
on storage.objects for update
to authenticated
using (
  bucket_id = 'org-maps'
  and (storage.foldername(name))[1] = public.current_org_id()::text
)
with check (
  bucket_id = 'org-maps'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);

create policy "admins delete their own org's maps"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'org-maps'
  and (storage.foldername(name))[1] = public.current_org_id()::text
);
