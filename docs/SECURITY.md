# Security

What protects a school's data, how that is tested, and what to do when something goes wrong. Written after the
2026-09-26 security audit. Identical in Campus Ready and Playbook except for names (see `docs/CROSS_APP_SYNC.md`).

## What protects what

| Risk | Protection |
|---|---|
| One school seeing or changing another's data | Row-level security on **every** table; every policy is limited to signed-in users and to their own school (`current_org_id()`). A profile can change only its display name; a school record only its name, code and logo. |
| Guessing the staff password or Facility Admin passphrase | Server-only password check (`/api/verify`); the public key cannot call it. **10 wrong guesses per person per school, 100 wrong or unknown attempts per person overall, each per 15 minutes**, then HTTP 429. Only wrong guesses count, so staff sharing one Wi-Fi address never trip it. Minimum lengths enforced in the database: staff password 8, Facility Admin passphrase 10; bcrypt work factor 10. |
| A leaked or former-employee password | Changing a password or passphrase (Admin → Overview) signs **everyone** out at once (`session_epoch`). Facility Admin access lasts 24 hours, then falls back to normal staff access. Suspending a school (`active = false`) also stops its API writes. |
| The secret key leaking | Used in one server-only file (`src/lib/supabase/admin.ts`); never in a client component, never in git (checked across the full history). The browser only ever has the public key. |
| Password hashes | An admin's browser cannot read them, even its own school's. |
| Flooding the write endpoints | Generous per-school, per-person limits on form submissions, checklist events, incident actions, contact edits. |
| Injected scripts, framing, stray external images | HSTS, no-framing, `nosniff`, Referrer/Permissions policies, and a Content-Security-Policy (`next.config.ts`). Plan text is rendered as Markdown with no raw HTML. |
| Logos and icons | Public buckets limited to 1 MB PNG/JPEG/WebP, uploadable only into the school's own folder. |
| Sign-up abuse | Public sign-ups are off in Supabase; new schools are created by the developer. |

The rate limiter stores only a **keyed hash** of a visitor's IP address, never the address itself.

## How it is tested

- `npm run security-check` — the cross-school attack test. Two throwaway schools; as one, try to read, insert, edit and
  delete the other's rows in every table, move itself into the other school, change its own protected fields, upload
  into the other's folder, call the password check, and read hashes; then the same as an anonymous visitor. Run it after
  **every** database change (a new table without row-level security fails it).
- `npm run smoke` group 9 "Security basics" runs after every deploy: the public key cannot call the password check, hashes
  are unreadable, minimum lengths, admin access lapses, a password change signs everyone out, guessing is throttled
  (HTTP 429), and the security headers are present.

## Applying database changes safely

`supabase/migrations/20260927100000_security_hardening.sql` removes the public key's access to the password check. The
app code is written to work both **before and after** it, so the order is: **deploy the code, then run the SQL** in the
Supabase SQL editor, then run `npm run smoke` and `npm run security-check`. (The other way round would break sign-in until
the code is live.) If the rate-limit functions are missing the code allows requests and logs
`rate limiter unavailable` — the smoke test then fails, so it cannot go unnoticed.

## When something goes wrong

| Situation | What to do |
|---|---|
| A school's staff password or passphrase leaked | The school admin sets a new one in **Admin → Overview**. Everyone is signed out immediately. |
| Sign everyone in every school out at once | Change `EOP_SESSION_SECRET` in Vercel (Settings → Environment Variables) and redeploy. |
| Suspend a school | In the Supabase Table Editor set `organizations.active` to false for it. |
| A legitimate person is locked out by the limiter | They wait 15 minutes, or in the SQL editor: `delete from public.rate_limits where bucket like 'verify:%';` |
| The Content-Security-Policy blocks something it shouldn't | Set `EOP_DISABLE_CSP=1` in Vercel and redeploy, then fix the policy in `next.config.ts` and remove the variable. |
| The secret key or database password was exposed (pasted in chat, committed, emailed) | Supabase → Project Settings → API Keys: roll the secret key, then update Vercel (`SUPABASE_SERVICE_ROLE_KEY`), the GitHub secret `SMOKE_SUPABASE_SERVICE_ROLE_KEY`, and `.env.local`. Reset the database password in Project Settings → Database. |

## Owner checklist (only the account owner can do these)

- **MFA on every account that can change the system**: Supabase, Vercel, GitHub, GoDaddy, Resend, and the Google accounts
  behind them. The owner login is the biggest single point of failure.
- Supabase → **Advisors → Security** in each project: review and clear anything it lists, after every schema change.
- Supabase → Authentication: turn on **leaked-password protection** and set a longer minimum password (Pro plan).
- **Backups**: keep daily backups on (Pro) and consider Point-in-Time Recovery; do a restore drill once so the first
  time is not during an emergency.
- Never paste keys, passwords or passphrases into chat or email. If it happens, roll the key (above).

## Known limits

- Limits are per visitor address; an attacker with many addresses can guess faster — the minimum lengths are what make
  that impractical. Passphrases should be long and unusual, not a single word.
- The public family status page and anything on it is **public** (no login): write it for parents.
- Admin logins (Supabase Auth, email and password) have no second factor in the app yet; Supabase supports TOTP MFA if a
  customer requires it.
- The Content-Security-Policy allows inline scripts (Next.js needs them without per-request nonces); it still blocks
  framing, plugins, `<base>` tampering, and connections or images to other sites.
- Customers who enter regulated data (student records, patient information) take on that responsibility; the Terms say
  not to (see `docs/CUSTOMER_ONBOARDING.md`).
