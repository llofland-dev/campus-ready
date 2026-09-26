# Post-deploy smoke test

A script that exercises the **live site** right after a deploy and tells you whether the features that
matter still work. It exists because a bug once got through (in Playbook, the app this was forked from): the document
importer worked on the developer's Windows machine but crashed on Vercel's Linux servers, and nobody
found out until real documents were uploaded to the deployed site.

## Run it

After every deploy (wait for Vercel to finish first):

```
npm run smoke
```

It takes about a minute and prints `PASS` or `FAIL` for each check. It exits with an error code if any
check fails, so it can be wired into automation later.

Options (after `--`):

| Option | Meaning |
|---|---|
| `--url https://…` | Test a different address (default: `https://campus-ready.vercel.app`). |
| `--no-logs` | Skip the Vercel error-log check. |

## What it checks

1. **Site basics** — the public pages, the offline page and manifest, and the service worker with the
   offline-plan sync.
2. **Sign-up is closed** — `/admin/signup` redirects and the sign-in page has no sign-up link.
3. **User / Admin split** — password gate; wrong and blank passwords refused; a User cannot see or
   use the Incident Management tile and screens, its checklists, incident actions, or contact editing
   (enforced on the server);
   the admin passphrase unlocks it in place; failed unlocks leave the session alone; sign-out works.
4. **Document import** — generates a Word file, an Excel workbook and PDFs in code and uploads them to
   the live import endpoint as both a section and a checklist. Checks page splitting, tables, merged
   Excel cells, pagination, number formats, hidden sheets, picture handling, the clear message for a PDF
   with no text, the size limit, and the file-type check.
5. **Rendering** — publishes the imported drafts and checks the pages staff would open (tables, lists,
   headings, tap-to-dial phone numbers, checkboxes).
6. **Password reset and Supabase redirect settings** — these live in the Supabase dashboard, not in the
   code, so a wrong value breaks reset silently (it once sent people to `http://localhost:3000`). Asks
   Supabase (no email is sent) whether reset links may return to each production address, that a made-up
   address is refused (so the allow-list is real), and that the Site URL is a production address. Then
   follows one reset token end to end: redeem it, set a password, sign in, and confirm the same link is
   refused the second time. The address checks apply to production addresses only.
7. **Vercel log** — asks Vercel for any HTTP 500 errors during the run (production only; skipped if the
   Vercel CLI isn't signed in on this machine).

If a check in group 6 fails on the redirect or Site URL, the message says what to change:
Supabase → Authentication → URL Configuration. The production addresses it expects are listed in
`PRODUCTION_ORIGINS` at the top of `scripts/smoke/run.mjs`; add a new custom domain there too.

## When it refuses to start

Before doing anything it checks the three Supabase settings (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — in GitHub Actions, the repository secrets
`SMOKE_SUPABASE_URL`, `SMOKE_SUPABASE_ANON_KEY`, `SMOKE_SUPABASE_SERVICE_ROLE_KEY`) and names the one that is
wrong: missing, wrapped in quotes, pasted as `NAME=value` instead of just the value, spaces or a line break
around it, a URL that isn't `https://…`, or the anon and service-role keys swapped. It never prints the
values (they are secrets). Fix that setting and run again.

## Safety

- It only uses **synthetic** data. It never touches MAPLERIDGE or any real organization.
- It creates one throwaway organization (`ZZSMOKE…`) and one throwaway login (`zz-smoke-…@example.com`)
  in the same Supabase project as the site, and **always deletes them at the end** — even if a check
  fails. A run that dies hard leaves nothing that matters: the next run removes any `ZZSMOKE…` /
  `zz-smoke-…` leftovers older than an hour.
- It needs `SUPABASE_SERVICE_ROLE_KEY` (already in `.env.local`) to create and delete that data.
  That key never leaves your machine.

## When a check fails

The `FAIL` line names what broke. The usual next step is the Vercel log:

```
npx vercel@59.14.0 logs --status-code 500 --since 15m --expand
```

That shows the real server error (this is how the Playbook importer crash was diagnosed).

## Adding a check

Each check is one line in `scripts/smoke/run.mjs`:

```js
check("what should be true", someCondition, "detail shown only if it fails");
```

Add fixtures (test documents) in `scripts/smoke/fixtures.mjs`. Keep them fictional.


## Running it automatically

A GitHub Actions workflow (`.github/workflows/smoke.yml`) runs it after every successful production
deploy. It needs three repository secrets — see the comments at the top of that file. If one is
missing or malformed the workflow stops with a message naming the secret (see "When it refuses to
start"). You can also start it by hand from the repository's **Actions** tab.
