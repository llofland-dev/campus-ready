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
| 2026-10-13 | **Install page is now a real install flow** — Larry: "The 'install' routine is very clunky. The QR code takes me to the page, but no ability to install. It's just verbiage." The page used to be a wall of text for every device. It now detects the device: **Android / Chrome / Edge / Samsung / Chromebook** get a one-tap "Install Campus Ready" button that fires the browser's real install prompt (a tiny `<head>` script on every page catches the offer — `lib/install-prompt.ts` — so the welcome screen's small link also becomes an "Install the app" button); **iPhone/iPad** (Apple allows no install button) get only the three Safari steps with pictures of the Share and Add icons; **in-app browsers** (Facebook, Gmail, a QR scanner's viewer) are told to open Safari/Chrome, with a Copy-link button; an already-installed device is told so. The QR code now shows only on computers (a phone that scanned it is already on the phone). `?view=ios|android|desktop|inapp-ios|inapp-android|installed|prompt` previews each state. Device detection (`lib/install-device.ts`) checked against 19 real browser strings; the plain steps for every device stay in the page for no-JavaScript and offline | Campus Ready (Larry) | built, tested locally (smoke 112/112); committed locally, NOT pushed | **Candidate, decision pending** — Playbook has no install page yet; this flow would carry over unchanged apart from wording (its Android shell exists, iPhone has none) |
| 2026-10-13 | **Home-screen icons** — an exact 180x180 opaque `apple-touch-icon.png` for iPhones (was a 192px file iOS had to rescale) and a 512x512 full-bleed `icon-maskable-512.png` for Android (without one Android shrinks the icon onto a white circle), plus manifest/layout wiring, `scripts/make-icons.mjs`, `docs/ICONS.md` and three smoke checks that read the PNG headers | Campus Ready (Larry asked for the icon polish after the install page) | built, tested locally; awaiting push | **Candidate, decision pending** — checked read-only: Playbook has the same two gaps (no 180px iPhone icon, no maskable icon; its icons are 192/512 opaque PNGs). Artwork/branding is Playbook's own, so it is a separate change, not a copy. Native Android shell users are unaffected |
| 2026-10-13 | **Install page (`/install`)** — plain-language steps to add the app to an iPhone / Android / Chromebook home screen, the wait-for-"Ready offline" instruction, an offline check, and a server-drawn QR code (new dependency `qrcode-generator`, zero sub-dependencies; decoded and verified as the install address); linked from the home page (hidden once installed) and Support; smoke checks added | Campus Ready (Larry asked how staff get the app: link vs app store) | built, tested locally; awaiting push | **Candidate, decision pending** — Playbook has no iPhone app at all (Android shell only), so an install page would serve its iPhone users; wording differs per product and the Android Play-Store route changes the steps |
| 2026-10-13 | **Maps tile** — an org's admin uploads maps (floor plans, campus maps, evacuation routes: PNG/JPG/WebP/PDF, ≤10 MB, no SVG) under Admin → Maps; staff get a Maps tile (shown once a map exists), a grouped list, and a viewer with zoom (PDFs are drawn inside the app by PDF.js — see the PDF-viewer note at the end of this row). Files live in a **private** bucket `org-maps` and leave it only through `/plan/[code]/maps/[id]/file`, which checks the plan session; admins upload straight from the browser into `<org_id>/…` (storage policies). The service worker now saves map files with the rest of the plan (non-HTML responses are cached as-is; `pages` counts every saved entry). Account deletion also clears the bucket. New: `plan_maps` table, `lib/plan-maps.ts`, `MapIcon`, `TILE_COLORS.mapsTeal`, smoke group 4b (11 checks). Migration `20261013090000_plan_maps.sql` — run on Playbook's Supabase 2026-10-13. Proven: 23-check database/storage security test (two hospitals + anonymous), admin upload through the real screen, staff viewing, and **offline with the server stopped** (list, image viewer, PDF viewer and PDF file all open) | Playbook (Larry: hospitals need to upload maps) | **ported** — built and tested 2026-10-13, committed locally (`14484e8`), NOT pushed until Larry says. Migration run in Campus Ready's Supabase (`fgfmpafipxaudwqodgod`). Proven: the 23-check database/storage security test (two schools + anonymous), admin upload through the real screen, staff viewing, the PDF drawn in-app with navigation, and **offline with the server stopped**; smoke 110/110 on a local copy. Differences from Playbook: tile/header colour is `MAPS_COLOR` (palette purple — teal is Reunification), `PlanHeader` has no `textColor`, school wording; `sw.js` differs only by `CACHE_NAME`. A sample-school map set and `scripts/seed-demo-maps.mjs <CODE>` exist but are NOT loaded anywhere — the demo schools (`MAPLERIDGE`, `BRIDGEWAY`) need Larry's OK first | **shipped** (`bd9214e`, pushed 2026-10-13); proven live on DEMO (3 sample maps; no-session file = 403; public storage address = 400), smoke 99/99. Large files proven on the live site: 3.5, 6 and 9.5 MB maps all arrive byte-for-byte (Vercel's 4.5 MB limit does not apply to the streamed route), so the 10 MB cap stands. **PDF viewer (2026-10-13, Larry: "navigation not present on the hospital evacuation map"):** a PDF map used to be an "Open map" button that opened the bare PDF in a new browser tab — no header, back arrow or bottom bar. It is now drawn inside the page by PDF.js (legacy build 6.4.299, checksum-verified): two plain files `public/pdfjs/pdf.min.mjs` + `pdf.worker.min.mjs` (+ `VERSION.txt`), loaded by `pdf-viewer.tsx` with zoom and multi-page support; no package/lockfile change. The service worker saves those two files when a PDF map page names them (`pdfjsPattern` in `sw.js`). Proven in a phone-size browser and **offline with the server stopped**; smoke now checks the two files are served. A Campus Ready port must bring `public/pdfjs/`, `pdf-viewer.tsx`, the page change and the `sw.js` pattern too |
| 2026-10-12 | **Read-only demo plan** — `READ_ONLY_ORG_CODES` (default `DEMO`, like `PROTECTED_ORG_CODES`). Everything a plan visitor can write goes through three routes: `/api/checklist-event` (activity log), `/api/form-submission` (stored answers) and `/api/staff-update-contact` (a Facility Admin's phone/email edits). For a read-only plan the first two return `{ok:true, saved:false}` and store nothing (the checkboxes and the "email this form" step still work on the device), and the contact edit is refused with "This is a demonstration plan, so changes aren't saved." The org's own dashboard login is untouched. `getActiveSession()` now returns `readOnly`. Proven with a read-only and an ordinary throwaway plan side by side: read-only saved nothing, ordinary saved all three. Direct database writes with only the public key were already refused (12 attempts, nothing changed) | Playbook (Larry: nobody may update/delete/add on the public demo) | **pending — decision for Larry.** Same three routes exist (plus `incident-action`), and the demo school `MAPLERIDGE` has the same exposure if it is shared; port with `READ_ONLY_ORG_CODES` default `MAPLERIDGE` | **shipped** (`e8614d1`, pushed 2026-10-12); proven live on DEMO (form + checklist tap return `saved:false`, 0 rows written), smoke 88/88 |
| 2026-10-12 | **Tables fit a phone screen** — `src/components/markdown.tsx` forced every table to at least 480px, so the Number column of a two-column POTS list was cut off and needed a sideways swipe. A table now reserves room per column (6rem each; a two-column table fits, a wide one still scrolls), and a `tel:` number never wraps. Identical file in both apps | Playbook (Larry's DEMO POTS page on a phone) | **shipped** (`bc8f048`, pushed 2026-10-12; smoke 97/97) | **shipped** (`883d6f7`, pushed 2026-10-12; smoke 88/88). Proven in the phone-size browser with 2-, 3- and 6-column tables |
| 2026-10-06 | **Company legal name written without a comma** — "Emergency Preparedness Solutions LLC" is the exact name on the Delaware Certificate of Formation (filed 2025-10-27); the footer, Terms, Privacy and Support pages said "Solutions, LLC". Playbook: Home already uses the exact name. Playbook's store reviewer notes (`native-wrap` only) corrected on that branch. | Larry (formation paperwork) | **shipped** (`0f6bbd3`, pushed 2026-10-12) | **shipped** (`b46e3db`, pushed 2026-10-12); reviewer notes on `native-wrap` only |
| 2026-10-05 | **Checklist section dividers** — a checklist item whose text starts with the word `SECTION` (caps) shows as a bold red divider with no checkbox, is highlighted in the admin item list and is left out of the "X of Y complete" count. Text-based, no migration | Playbook (Larry, for the "Hospital Evacuation Procedures" checklist) | **shipped** (`953afaf`, pushed 2026-10-12; smoke 97/97) | shipped (`f623fb1`), proven live |
| 2026-10-05 | **"Ready offline" status line + a more honest offline save**: small pill under "Access level" (Saving / Ready · saved N min ago / incomplete / couldn't save + Try again / not saved yet / unsupported). The service worker now reports `failed` pages so a half-finished save is never "ready"; "Ready" needs the saved pages (not just the home page) to still be in the browser, so an iPhone wiping the cache can't leave a false "Ready"; 20 s worker timeout; retries when back online | Larry (both apps) | shipped (`34f3ad0`, `87e7a85`); proven on production incl. the delete-the-cache test | shipped (`cc8d1be`, `78e5385`); same proof |
| 2026-10-05 | **"Unlock admin access" is now a dialog** (was a cramped inline form squeezed against the bottom nav on phones) **and a regression from the tier fix, fixed**: sign-out/unlock still cleared the old un-tiered sync marker, so signing straight back in skipped the re-save. One helper (`lib/offline-sync-key.ts`) builds and clears the markers | Playbook (Larry's phone screenshots) | shipped (`5ad92f3`) — had the sign-out regression live until this | shipped (`fb85a88`) |
| 2026-10-05 | **Offline sync keyed on tier, not just plan code** — a staff-tier sync's 6h cooldown permanently blocked re-sync after unlocking Facility Admin, so Incident Management/Command was never saved for offline use in that (completely normal) sequence; proven on a throwaway school, fixed, re-proven on production | Campus Ready (found verifying offline mode before a demo) | shipped (`5082f53`), deployed, re-verified on production with the exact failing sequence | **shipped** (`76743d0`, pushed 2026-10-05); proven on production with the exact staff-then-unlock sequence |
| 2026-09-26 | **Times shown in the viewer's timezone** (`<ClientTime>`, `useClientValue`). Server code formatted times in UTC, so families/admins saw the wrong hour, and client components logged React error #418. Smoke guard added | Campus Ready (found testing on production) | shipped (`81b9150`); verified on production in a New York browser, smoke 79/79 | shipped (`88839b2`, in `main` at `0ec367f`); verified on production in a New York browser (admin incidents page, no #418), smoke 74/74. Playbook's admin incident pages had the same bug |
| 2026-09-26 | **Password-reset link that works on any device** (`?token_hash=`, redeemed only when the button is pressed so mail scanners can't use it up) and `docs/SUPABASE_EMAIL_TEMPLATES.md` | Campus Ready | shipped (`8cd1d7b`); templates saved in Supabase | shipped (page live, smoke token-redeem checks pass). Playbook's **Reset Password** template was edited by Larry in Playbook's Supabase on 2026-09-28 and proven by a real reset (until then reset links from the stock `?code=` template failed with "invalid or expired"); the **Invite** template is still unconfirmed |
| 2026-09-26 | **Smoke test hardening**: names a malformed setting without printing it; checks Supabase redirect allow-list and Site URL; follows a reset token end to end; times guard | Campus Ready | shipped (`26de024`, times guard in `81b9150`) | shipped (`88839b2`); Playbook's Supabase reset settings already passed |
| 2026-09-26 | **Lint clean-up** (`setState` in effects → `useSyncExternalStore`) | Campus Ready | shipped (`26de024`, 0 errors) | n/a — Playbook lint was already clean; the new shared hook comes with the time fix |
| 2026-09-26 | **Custom email sending (Resend)** on `mail.emergencyprepsolutions.org`, SMTP entered in Supabase | Campus Ready | done and tested | **pending** — Larry, in Playbook's Supabase (same verified domain; use a separate API key). Still open on 2026-10-05, and it is a real risk: Supabase's default sender returned `email rate limit exceeded` on 2026-09-28 while testing a DEMO admin reset, so customer invites/resets can silently not arrive |
| 2026-09-26 | **GitHub Actions versions** in the smoke workflow (`checkout` / `setup-node` v4 → v5; GitHub was forcing the old Node-20 versions onto Node 24) | Campus Ready | built; awaiting push, then confirm the next CI run is green | **shipped** (`.github/workflows/smoke.yml` on Playbook `main`); the Node-20 warning should be gone from its next post-deploy run |
| 2026-09-26 | **Support page** with school wording (911 banner, families, deletion) and smoke checks | Campus Ready | built; awaiting push | n/a — Playbook already has its own Support page (hospital wording) |
| 2026-09-26 | **Family Pick-Up Information page** on the public parent status page (preferred over the staff "Meeting Locations" page), added to the two Campus Ready demo plans, with smoke checks and an onboarding note | Campus Ready (found in the Bridgeway pre-demo run-through) | built; awaiting push | n/a — school-only feature (Playbook has no public status page) |
| 2026-09-26 | **Security hardening from the audit**: password-guess throttling (also closes the public password check), session revocation on password change, admin tier limited to 24 h, hashes hidden from browsers, DB-enforced minimum lengths, Content-Security-Policy, `npm run security-check` + smoke group 9, `docs/SECURITY.md`. Playbook also gets constant-time + throttled auth on its MEDICS export endpoints | Campus Ready (security audit of both apps) | **shipped** (`1b8947a`, deployed; Larry ran the SQL in `supabase/migrations/20260927100000_security_hardening.sql`); smoke 97/97, `npm run security-check` 52/52, CSP + offline service worker verified on production | **shipped** (`929c63b`, deployed; Larry ran the same SQL in Playbook's Supabase); smoke 87/87, `npm run security-check` 49/49, CSP + offline service worker verified; the MEDICS export endpoints reject wrong tokens and answer 429 after 20 failures. **`native-wrap` does not have these fixes yet** (its merge is still pending) |
| 2026-09-26 | **Merge Playbook `main` into `native-wrap`** (the native-app branch, local only) | — | — | **done** (local `native-wrap` `a3184c1`, not on GitHub): took `native-wrap`'s lockfile and regenerated it with npm 10 — 0 existing versions changed, 8 `@emnapi`/wasm packages added; `npm ci` passes under npm 10 and 11, build/lint/tsc clean. The Android app loads the live site (`server.url`), so it already had every web fix; a stale `node_modules` in the folder needs `npm ci` |
| 2026-09-26 | Reverse audit, Playbook → Campus Ready | — | nothing pending: every difference found was branding or product-specific | — |
| 2026-09-25 (earlier) | Playbook fixes brought into Campus Ready up to `d08a46a` (importer fix, offline cache, access-level controls, smoke test) | Playbook | shipped | — |

### Candidates for Larry to decide (Campus Ready → Playbook)

- **"Mail to" incident report** for After-Action Review (`mail-incident-report.tsx`) — generic, hospitals also
  write after-action reports.
- **Active-incident banner** on the plan home screen.

### Candidates for Larry to decide (Playbook → Campus Ready)

- **Bold home-screen tile colors** (Playbook's six tiles use Larry's exact hex colors, 2026-09-27; Campus Ready keeps its own pastel palette — Larry asked for Playbook only). If ever adopted: keep the tile colors in their own map (`TILE_COLORS`), never in the shared `PALETTE` — appending to `PALETTE` once shifted the auto-cycled color of unrelated sections and made text unreadable (Playbook `993c243`).

### Known open differences worth watching

- `PROTECTED_ORG_CODES` (orgs that can't be deleted by their own login) defaults to `DEMO` in Playbook and
  `MAPLERIDGE` in Campus Ready; Bridgeway is not protected.
