-- Campus Ready: plan/contact/form/checklist distribution app — core schema.
-- Forked from Playbook (the hospital-market version of this product) —
-- this project has its own, independent Supabase instance.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Organizations: one row per client org. org_code is the public, shareable
-- lookup code staff type in at the front door (see /). access_password_hash
-- is the optional second factor — never selected directly by any client,
-- only ever touched via the security-definer RPCs in the RLS migration.
-- ---------------------------------------------------------------------------
create table public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  org_code               text not null unique,
  access_password_hash   text,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: links a Supabase auth user (an org's content admin) to the org
-- they manage, for RLS scoping on the admin side.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  org_id        uuid references public.organizations (id),
  role          text not null default 'admin' check (role in ('admin')),
  display_name  text,
  created_at    timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles (org_id);

-- ---------------------------------------------------------------------------
-- Plan content: sections are the flip-chart "tabs", pages are the content
-- within each tab, shown in sort_order.
-- ---------------------------------------------------------------------------
create table public.plan_sections (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index plan_sections_org_id_idx on public.plan_sections (org_id);

create table public.plan_pages (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.plan_sections (id) on delete cascade,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index plan_pages_section_id_idx on public.plan_pages (section_id);
create index plan_pages_org_id_idx on public.plan_pages (org_id);

-- ---------------------------------------------------------------------------
-- Contacts: one-touch-dial contact list.
-- ---------------------------------------------------------------------------
create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  role_title  text,
  phone       text,
  category    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index contacts_org_id_idx on public.contacts (org_id);

-- ---------------------------------------------------------------------------
-- Forms: fillable forms staff complete on-device and email out. `fields` is
-- an ordered array of {id, label, type, required}, type one of
-- text|phone|email|textarea|checkbox|date. No submission storage — the
-- point (per the source product) is a mailto: composed on-device, not a
-- backend inbox.
-- ---------------------------------------------------------------------------
create table public.forms (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  title            text not null,
  description      text,
  recipient_email  text,
  fields           jsonb not null default '[]'::jsonb,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index forms_org_id_idx on public.forms (org_id);

-- ---------------------------------------------------------------------------
-- Checklists: e.g. incident-command role checklists. Check-off state is kept
-- client-side (localStorage) since it's ephemeral per-drill/event use, so
-- there's no response/state table here — just the checklist definitions.
-- ---------------------------------------------------------------------------
create table public.checklists (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  title       text not null,
  category    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index checklists_org_id_idx on public.checklists (org_id);

create table public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.checklists (id) on delete cascade,
  org_id        uuid not null references public.organizations (id) on delete cascade,
  text          text not null,
  sort_order    integer not null default 0
);

create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
