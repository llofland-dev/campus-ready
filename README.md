# Campus Ready

A mobile-friendly PWA for distributing a school's emergency operations plan to staff —
quick-reference drills/protocols, a one-touch-dial contact list, fillable/emailable forms, and
checklists — gated behind a plan code and optional password, and readable offline once visited.

## Setup

1. Create a new Supabase project.
2. Run the migrations in `supabase/migrations/` against it, in order — either
   `supabase link` + `supabase db push` from this directory, or paste each file into the
   Supabase Studio SQL editor.
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL, anon key, and
   service-role key (Project Settings → API), plus a random `EOP_SESSION_SECRET`
   (`openssl rand -base64 32`).
4. `npm install`
5. `npm run dev`

## Two logins, on purpose

- **Admin** (`/admin`): the org's content editors. Real Supabase Auth accounts. The first user
  for a new org signs up at `/admin/signup`, which creates both their account and their
  organization together (`eop_create_org_for_self` RPC) — there's no pre-existing admin to
  assign a fresh signup to.
- **Field staff** (`/`): no account. They enter the org's plan code (and password, if the org
  set one) and get a signed, httpOnly session cookie scoped to that org — see
  `src/lib/eop-session.ts` and `src/lib/eop-org.ts`. All public content reads go through a
  service-role Supabase client gated by that cookie (`src/lib/supabase/admin.ts`), not through
  anon-key RLS, so the password is a real server-side gate.

## Offline

`public/sw.js` is a small hand-rolled service worker (no third-party PWA plugin — Next.js 16 is
too new to trust one) doing network-first-with-cache-fallback across the whole `/plan/*` side of
the app: static assets and previously-viewed pages both get cached, and any successful online
fetch refreshes the cache. `/admin/*` and `/api/*` are excluded so the admin side and the access
gate always hit the network.

## Not yet built

Multiple plans per organization and a cross-org super-admin view are straightforward extensions
of this schema but weren't in the agreed v1 scope.
