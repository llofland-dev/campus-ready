# Demo script (about 12 minutes)

For a live demo to a school or program (first used for Adventist Behavioral Health Schools, on the
`BRIDGEWAY` demo plan). Contains no passwords — the Facility Admin passphrase is set by Larry and is not
written down here.

## Before you start (5 minutes, the day before and again an hour before)

- [ ] **Run `npm run demo-check`** (read-only; `-- MAPLERIDGE` for the other plan). It confirms **no incident is active** (an
      active one shows a red banner on every staff phone), flags placeholders and real-looking phone numbers or emails, and
      opens every staff screen on the live site. It must end with "Ready to demo."
- [ ] Phone: Campus Ready installed from `campusready.emergencyprepsolutions.org`, opened once **on Wi-Fi with a minute
      to spare** so the plan is saved for offline use.
- [ ] Second device (or a second browser tab) ready to play the **parent**: open `…/status/BRIDGEWAY`.
- [ ] You know the **Facility Admin passphrase**. Not signed in to the admin already on the phone (Plan home → "Sign out").
- [ ] Bad venue Wi-Fi? Use your phone's hotspot. Fallback plan: `MAPLERIDGE` has the same content.

## The story

1. **Staff need the plan in their pocket, not in a binder** (1 min). Open the home page, tap *Get Started*, enter
   `BRIDGEWAY`. No accounts for staff — the plan code is the front door.
2. **Find what to do in seconds** (3 min). Pinned contacts and 911 at the top (tap to dial). *Drills & Protocols* →
   *Quick Reference*. *Core Protocols* → **Secure** (note the escalation to a Phased Emergency Response).
   *Individual Support & Functional Needs* → **De-escalation During Emergency Protocols** — written for their students.
   *Reunification* → **Verifying and Releasing a Student** (photo ID, second-person check).
3. **It works with no signal** (1 min). Airplane mode; open a page you have not opened this session.
4. **Live incident** (4 min). Plan home → **Unlock admin access** → type the passphrase → the **Incident Management** tile
   appears.
   - *Incident Status* → **Start incident** (leave the name blank — it stamps the time in your timezone).
   - Point at the red **Active incident** banner that now shows on every staff phone.
   - **Post an update** ("Hold in effect. Students are safe in classrooms.") → on the parent device it appears within
     20 seconds, with no login and the time in the parent's own timezone. Scroll to **Picking up your child** — that is the
     school's own "Family Pick-Up Information" page, written for parents (a public page: no login, so nothing staff-only on it).
   - Tick a step on the **Hold Drill Checklist**: while an incident is active it is logged to it with the time (and the
     person's name, if they enter one when the checklist asks).
   - **Close incident**. Then **Mail to** → pick the Program Director from the contacts list → *Email incident report*:
     the timeline is drafted into your mail app for the After-Action Review. (Nothing is sent by our servers.)
5. **Setting it up for a school** (2 min). On `MAPLERIDGE`'s admin login (Bridgeway has none): **Import from Word** — upload
   their existing EOP; it becomes a draft to review before publishing. Contacts, forms, checklists, staff password and
   Facility Admin passphrase live under Overview.
6. **Close: trust** (1 min). It is **not** an alerting or 911 service (say so first — it is on the Support page). No accounts or
   student records are needed. See Privacy (FERPA "school official" model) and Support. Each school's data is separate.

## After the demo

- [ ] **Close the incident** if one is still open.
- [ ] Tell Claude: "clean up the Bridgeway demo incidents". It removes the incidents created during the demo (and their
      updates and check-off logs) after confirming with you — Bridgeway is real demo data, so nothing is deleted without your OK.
- [ ] Sign out of the plan on the demo phone.

## If something goes wrong

| Problem | Do this |
|---|---|
| Passphrase rejected | Type it slowly (it is case-sensitive). If it still fails, ask Claude to check the hash; do not guess repeatedly. |
| Page looks stale | Pull down to refresh; the parent page also refreshes itself every 20 s. |
| No connection | Say so — that is the offline story. The saved pages still open. |
| Parent page shows no update | Wait 20 s; confirm the incident is still *active* (closed incidents hide their updates). |
