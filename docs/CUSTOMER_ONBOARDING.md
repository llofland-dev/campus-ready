# Onboarding a school or district

Self-service sign-up is closed: `/admin/signup` redirects to the sign-in page and there is no
"Set up your plan" link. Organizations are created after an agreement is in place.

## Steps

1. **Agreement first.** Confirm the school or district.
2. **Create their admin login** in the Supabase dashboard for this app's project:
   *Authentication → Users → Add user → Create new user*. Enter their email and a temporary
   password and tick **Auto Confirm User**. (*Invite user* also works and emails them a link.)
3. **Send them the sign-in details** (Admin Sign In in the app, or `/admin/login` on the web) and
   ask them to change the password (*Forgot password?* on the sign-in screen sends a reset link).
   The reset and invite emails need the templates in `docs/SUPABASE_EMAIL_TEMPLATES.md` so the link
   works on any device.
4. **On first sign-in they see "set up your organization"**: they enter the school name and a plan
   code (3–24 letters, numbers, dashes or underscores; staff type this to open the plan). You can
   choose the code for them by telling them what to enter.
5. **They build the plan** (protocols, contacts, forms, checklists, reunification). Staff open it
   with the plan code.
   **Ask them to write a page titled `Family Pick-Up Information`** (in the Reunification section). It is
   the "Picking up your child" text on the public family status page (`/status/<plan code>`). That page has
   **no login, so anything on it is public** — write it for parents (where to go, what to expect, what to
   bring) and keep staff-only detail out of it. If there is no such page, the family page falls back to the
   staff page titled `Meeting Locations`, which is written for staff and reads awkwardly to parents.

## Turn off public sign-ups in Supabase (this is what actually locks it)

Removing the link and page is not enough on its own: anyone can still call Supabase's public
sign-up API and then create an organization. In the Supabase dashboard:
*Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".* (If the menu names
differ in your dashboard, search the Authentication section for that toggle.) Admins you create
with **Add user** or **Invite user** still work; strangers can no longer register. Password reset
and sign-in for existing admins are unaffected.

## Suspending an organization

In the Supabase Table Editor, open `organizations`, find the row and set `active` to false. Staff
access is refused with a clear message and their content is kept. Set it back to true to restore.
