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
6. **Vercel log** — asks Vercel for any HTTP 500 errors during the run (production only; skipped if the
   Vercel CLI isn't signed in on this machine).

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
deploy. It needs three repository secrets — see the comments at the top of that file. If they aren't
set the workflow fails with a clear "missing Supabase settings" message. You can also start it by
hand from the repository's **Actions** tab.
