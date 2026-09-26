# Supabase email templates (password reset and invite)

The reset and invite emails must link to the app in the **token** form, so the link works in any
browser or on any device. Supabase's stock templates send a `?code=` link that only works in the
same browser that asked for it, and only once — an admin who requests a reset on a laptop and opens
the email on a phone sees "invalid or expired".

These are edited once, by hand, in the Supabase dashboard (they are project settings, not code):
*Authentication → Emails → Templates* (older dashboards: *Authentication → Email Templates*).

The link is built from the project's **Site URL**
(*Authentication → URL Configuration*, currently `https://campusready.emergencyprepsolutions.org`).
`/admin/reset-password` handles the link. It only redeems the token when the person presses
**Update password**, so a mail filter that opens links to scan them cannot use the token up first.

## Reset Password

Subject: `Reset your Campus Ready password`

```html
<h2>Reset your password</h2>
<p>We received a request to reset the password for your Campus Ready admin account.</p>
<p><a href="{{ .SiteURL }}/admin/reset-password?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
<p>If you didn't ask for this, ignore this email — your password won't change.</p>
```

## Invite user

Subject: `You've been invited to Campus Ready`

```html
<h2>You've been invited to Campus Ready</h2>
<p>An admin account has been created for you. Choose a password to get started.</p>
<p><a href="{{ .SiteURL }}/admin/reset-password?token_hash={{ .TokenHash }}&type=invite">Choose your password</a></p>
```

Leave the other templates (Confirm sign up, Magic link, Change email, Reauthentication) as they are —
sign-ups are closed and the app does not use them.

## Testing a change

Use a throwaway user (never a real customer): create it with *Authentication → Users → Add user*,
click **Send password recovery**, open the email in a *different* browser or on your phone, set a
made-up password, then delete the user. The stock template's link (`?code=`) and a dashboard-issued
link (`#access_token=`) still work too, so nothing breaks if the template has not been edited yet.
