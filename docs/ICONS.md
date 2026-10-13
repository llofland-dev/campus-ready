# Home-screen icons

What shows on a phone's home screen when someone adds Campus Ready, and how to change it.

| File | Size | Used for |
|---|---|---|
| `public/icon-192.png`, `public/icon-512.png` | 192 / 512 | The normal ("any") icons in the web manifest, the browser tab and the service worker's offline cache. The EPS logo on white. |
| `public/apple-touch-icon.png` | 180 × 180 | iPhone and iPad "Add to Home Screen". Exactly 180px and opaque — an iPhone paints any transparent area black, and it rounds the corners itself. Same artwork as `icon-512.png`, scaled down. |
| `public/icon-maskable-512.png` | 512 × 512 | Android. A *maskable* icon fills the phone's own icon shape (circle, squircle or rounded square) edge to edge. Without one Android shrinks the normal icon onto a white circle with a wide margin. The logo is scaled to sit inside the central "safe circle" (radius 40% of the width) so no shape can crop it. |
| `public/favicon.ico` | — | Browser tab on a computer. |

The manifest (`public/manifest.webmanifest`) lists the 192 and 512 icons as `"purpose": "any"` and the maskable one as
`"purpose": "maskable"` — kept as separate files on purpose; one file claiming both purposes shows badly on one or the
other. The iPhone icon is linked from `src/app/layout.tsx`.

## Changing the artwork
1. Replace `public/logo.png` (transparent background) and/or `public/icon-512.png`.
2. Run `node scripts/make-icons.mjs` — it regenerates the iPhone and maskable icons. (It uses `sharp`, which Next.js
   installs; if it is ever missing, `npm install --no-save sharp` for a one-off run.)
3. Look at the result; the script prints how much of the safe circle the logo uses.
4. `npm run smoke` checks after a deploy that the iPhone icon is an exact 180×180 opaque PNG linked from the home page
   and that the manifest offers a real 512×512 maskable icon.

## Things that cannot be tested from a computer
- **An installed copy keeps the icon it had when it was added.** An iPhone saves the icon at install time, so people who
  already installed Campus Ready keep the old one until they remove it and add it again. Android usually refreshes its
  own within a day or so.
- Check the real thing: add Campus Ready to an iPhone and an Android phone and look at the icon.
