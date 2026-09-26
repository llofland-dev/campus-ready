# Keeping Campus Ready and Playbook in step

Campus Ready (K-12 schools) started as a fork of Playbook (hospitals) and the two still share most of
their code: sign-in, the plan/checklist/contact/form screens, the offline cache, the document importer,
the smoke test, the reset-password flow. **A fix or improvement to shared code helps both apps, so it must
reach both.** Larry's standing rule (2026-09-26): improvements that help all apps are two-way, and every
change is recorded in BOTH repositories — not only where it was made.

This file is identical in both repos. Keep the two copies in step (a change to the process or the ledger
goes into both).

## The two apps

| | Campus Ready | Playbook |
|---|---|---|
| Customers | K-12 schools | Hospitals / health systems |
| Folder | `C:\Users\Larry\Documents\GitHub\campus-ready` | `C:\Users\Larry\Documents\GitHub\playbook` |
| GitHub | `llofland-dev/campus-ready` | `llofland-dev/playbook` |
| Web branch | `master` (a push deploys production) | `main` (the web app); `native-wrap` is the native-app branch that regularly merges `main` in |
| Public address | `campusready.emergencyprepsolutions.org` (also `campus-ready.vercel.app`) | `playbook.emergencyprepsolutions.org` |
| Supabase project | `fgfmpafipxaudwqodgod` | `lyulbiexhsgnionkbyph` |

Each has its own database, users and Supabase settings, so anything configured in a dashboard (email
templates, SMTP, redirect URLs) is done **once per app**. Related products with the same lineage — HICS
(MEDICS) and Playbook: Home — may need the same fixes when the change is generic (Next.js, Supabase auth,
PWA). They have not been audited; check when a shared fix lands.

## Rule for every change

Before finishing any fix or improvement in either app:

1. **Classify it.** *Shared* (auth, reset, offline cache, importer, checklists, contacts, forms, smoke test,
   lint hygiene, time and date display, email setup) or *product-specific* (see below).
2. **Shared → port it to the other app** on a branch off that app's deploy branch (or, if it can't be done
   now, record it as **pending** in the ledger with the reason).
3. **Record it in the ledger below, in BOTH repos.**
4. **Tell Larry** what moved and what is pending. Nothing is pushed or deployed until he says "push".

## Product-specific — do not port automatically

- Legal and policy wording: Playbook's Terms warn against entering patient/protected health information;
  Campus Ready's Terms and Privacy are written for FERPA / schools. Never copy one to the other.
- Names and structure: category names (`hics`/`codes` in Playbook, `ics`/`protocols` and the merged
  "Incident Management" in Campus Ready), "Playbook admin" vs "Campus Ready admin", logos, manifests, cache names.
- School-only features: the public parent status page and glossary, incident updates, the "Incident
  Management" screens, the active-incident banner, the "Mail to" incident report.
- Playbook-only: the Support page, the seed scripts, the `/api/org/[code]/incidents` endpoints, native-app work.
- Demo data and pricing.

Some product-specific features may still be worth offering to the other product — those are listed under
*Candidates* and are Larry's call, not something to port on our own.

## How to port a change

1. Start from the other app's **deploy branch** in a separate folder so its current checkout is untouched:
   `git worktree add ../playbook-sync -b sync-from-campus-ready main` (run inside `playbook`; for the other
   direction use `master` and a folder next to `campus-ready`).
2. Copy or re-apply the change. Shared files are often identical (check with the comparison script below);
   where they differ only by names, lift the shared block programmatically instead of retyping it. Line endings
   differ (LF vs CRLF): normalise before string replacement.
3. In the worktree run `npm ci` (a folder link to another `node_modules` does NOT work with Turbopack),
   copy the app's `.env.local` in (it is git-ignored — never commit it), then `npx tsc --noEmit`,
   `npm run lint`, `npm run build`.
4. Run that app's smoke test against its live site (`npm run smoke`, see `docs/SMOKE_TEST.md`) — it uses
   throwaway data it deletes. New checks should FAIL on the unfixed live site and pass after deploy.
5. Commit on the branch. Do not merge, push or deploy without Larry's "push". For Playbook the order is
   `main` first, then merge `main` into `native-wrap`.
6. Update the ledger in both repos.

To see what differs between the apps at any time (fewest changed lines first — tiny diffs are branding):

```
node scripts/compare-apps.mjs
```

Dashboard settings cannot be ported by code: email templates, SMTP and URL configuration are set by Larry in
each app's own Supabase project (see `docs/SUPABASE_EMAIL_TEMPLATES.md`).

## Ledger

Status words: **shipped** = deployed to production; **ported** = done on a branch, tested, waiting for
"push"; **pending** = not done yet.

| Date | Change | Origin | Campus Ready | Playbook |
|---|---|---|---|---|
| 2026-09-26 | **Times shown in the viewer's timezone** (`<ClientTime>`, `useClientValue`). Server code formatted times in UTC, so families/admins saw the wrong hour, and client components logged React error #418. Smoke guard added | Campus Ready (found testing on production) | shipped (`81b9150`); verified on production in a New York browser, smoke 79/79 | shipped (`88839b2`, in `main` at `0ec367f`); verified on production in a New York browser (admin incidents page, no #418), smoke 74/74. Playbook's admin incident pages had the same bug |
| 2026-09-26 | **Password-reset link that works on any device** (`?token_hash=`, redeemed only when the button is pressed so mail scanners can't use it up) and `docs/SUPABASE_EMAIL_TEMPLATES.md` | Campus Ready | shipped (`8cd1d7b`); templates saved in Supabase | shipped (page live, smoke token-redeem checks pass). **Playbook's Supabase email templates still to be edited by Larry — the deploy is done, so he can do it now** |
| 2026-09-26 | **Smoke test hardening**: names a malformed setting without printing it; checks Supabase redirect allow-list and Site URL; follows a reset token end to end; times guard | Campus Ready | shipped (`26de024`, times guard in `81b9150`) | shipped (`88839b2`); Playbook's Supabase reset settings already passed |
| 2026-09-26 | **Lint clean-up** (`setState` in effects → `useSyncExternalStore`) | Campus Ready | shipped (`26de024`, 0 errors) | n/a — Playbook lint was already clean; the new shared hook comes with the time fix |
| 2026-09-26 | **Custom email sending (Resend)** on `mail.emergencyprepsolutions.org`, SMTP entered in Supabase | Campus Ready | done and tested | **pending** — Larry, in Playbook's Supabase (same verified domain; use a separate API key) |
| 2026-09-26 | **Merge Playbook `main` into `native-wrap`** (the native-app branch, local only) | — | — | **pending — Larry's call.** Everything merges cleanly except `package-lock.json` (native dependencies vs the lockfile fix in `main`); aborted, branch untouched |
| 2026-09-26 | Reverse audit, Playbook → Campus Ready | — | nothing pending: every difference found was branding or product-specific | — |
| 2026-09-25 (earlier) | Playbook fixes brought into Campus Ready up to `d08a46a` (importer fix, offline cache, access-level controls, smoke test) | Playbook | shipped | — |

### Candidates for Larry to decide (Campus Ready → Playbook)

- **"Mail to" incident report** for After-Action Review (`mail-incident-report.tsx`) — generic, hospitals also
  write after-action reports.
- **Active-incident banner** on the plan home screen.

### Known open differences worth watching

- `PROTECTED_ORG_CODES` (orgs that can't be deleted by their own login) defaults to `DEMO` in Playbook and
  `MAPLERIDGE` in Campus Ready; Bridgeway is not protected.
