@AGENTS.md

# Campus Ready — working notes for Claude

Campus Ready distributes a school's emergency operations plan (EOP) to staff on their phones: drills/protocols, one-tap contacts, forms, checklists, reunification, and an
incident-management area for a facility admin. It is a separate product from Playbook (hospitals) — its own repo, Supabase project and Vercel project — that started as a fork of it.
Deeper history and the operations sheet live in Claude's project memory for this folder (`campus-ready-project.md`, `campus-ready-ops.md`); `README.md` and `docs/` cover the app.

## Commands
- `npm run dev -- -p 3002` (dev server), `npm run build`, `npm run lint` (5 known errors in the incident-management files; they are not new and the build passes).
- `npm run smoke` — the post-deploy smoke test (about a minute). **Run it after every production deploy.** See `docs/SMOKE_TEST.md`.

## Deploying
- GitHub `llofland-dev/campus-ready`, default branch **`master`**. Vercel (project `campus-ready`) is connected to it: **a push to `master` deploys production** to https://campus-ready.vercel.app.
- Ask Larry before pushing. He says "push" when he wants it. Do not run `vercel --prod` yourself unless he explicitly asks (it was blocked by the permission classifier without that).
- After a deploy: wait for the new routes to appear, then `npm run smoke`. `.github/workflows/smoke.yml` also runs it automatically once the three `SMOKE_SUPABASE_*` repository secrets exist.

## How the app works (the parts that matter)
- Two logins. Admins sign in at `/admin` (Supabase Auth). Staff need no account: they enter a plan code (plus an optional password) and get a signed, httpOnly `eop_session` cookie
  (`src/lib/eop-session.ts`, `src/lib/eop-org.ts`). Public reads use a service-role client scoped by that cookie's org.
- Two staff tiers: **User** and **Facility Admin**. The tier is set by what is typed at the gate and lasts up to 30 days; `PlanAccess` (plan home) lets a User unlock admin access in place and sign out.
  The admin-only category is `ics`, shown as **Incident Management** (`/plan/<code>/incident-management`). Enforce the tier on the SERVER (pages, `/api/incident-action`, `/api/checklist-event`,
  `/api/staff-update-contact`), never only by hiding buttons.
- Self-service sign-up is closed (`/admin/signup` redirects). New organizations are created by the developer — see `docs/CUSTOMER_ONBOARDING.md`. Supabase public sign-ups are switched off.
- Content is Markdown in `plan_pages.body`. The document importer (`src/lib/document-import.ts`, `src/lib/pdf-text.ts`) turns Word/Excel/PDF into drafts an admin reviews before publishing.
- Offline: `public/sw.js` never caches Next's data (`?_rsc=`) requests; it saves the whole plan as real pages while online (`plan-offline-sync.tsx`) so in-app navigation works with no connection.

## Rules of the road
- **Test server features against the deployed site, not just locally.** The importer once worked on Windows and crashed on Vercel's Linux runtime. Diagnose with
  `npx vercel@59.14.0 logs --status-code 500 --since 15m --expand`.
- Never type, print or store Larry's passwords, keys or passphrases (no values from `.env.local` in files or chat). Test with throwaway orgs/logins with made-up passwords and delete them; the smoke
  test does this for you (`ZZSMOKE…` / `zz-smoke-…`).
- Real data must not be changed without his confirmation: the demo orgs `MAPLERIDGE` and `BRIDGEWAY` (a real prospect demo) and his admin login. Read-only checks are fine.
- Terms / Privacy / Support pages are intentionally not ported from Playbook yet — they need school-specific wording (FERPA, student records). Don't copy Playbook's hospital wording.
- Playbook fixes are brought over with a three-way merge, not by hand-copying — the method and the fork point (`d08a46a`) are in the ops note.
- Paste SQL and commands inline in chat; file links have not opened for Larry. Dashboard security settings (sign-ups, passwords, GitHub secrets) are his to change.
