// Generates the two home-screen icons that are derived from the logo, so they can be regenerated exactly:
//
//   node scripts/make-icons.mjs
//
//   public/apple-touch-icon.png   180x180  what an iPhone/iPad uses when "Add to Home Screen" is chosen. Opaque
//                                           (iOS fills transparent areas with black) and exactly 180px, so iOS does not
//                                           have to rescale a 192px image. iOS rounds the corners itself, which cuts
//                                           nothing off the existing artwork, so this is simply public/icon-512.png
//                                           scaled down — the logo looks exactly as it always has, at the right size.
//   public/icon-maskable-512.png  512x512  for Android. A "maskable" icon is full-bleed: Android crops it to the
//                                           phone's own icon shape (circle, squircle, rounded square). Without one
//                                           Android shrinks the normal icon onto a white circle with a wide margin.
//                                           Everything that matters must sit inside the central safe circle
//                                           (radius 40% of the width), so the logo is scaled to fit in it.
//
// Both are the logo on white (the logo's text is dark blue; a dark background would hide it). The maskable icon is
// built from public/logo.png (640x651, transparent background). public/icon-192.png and icon-512.png are left as
// they are.
// Uses `sharp`, which Next.js installs as one of its own dependencies (it is not listed in package.json; if it is
// ever missing, `npm install --no-save sharp` brings it back for a one-off run).

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "public", "logo.png");

// Where the logo's drawn pixels are: its bounding box, and how far the farthest drawn pixel is from the box centre.
const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
let x0 = W, x1 = -1, y0 = H, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2;
let reach = 0;
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (data[(y * W + x) * 4 + 3] > 24) reach = Math.max(reach, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
const boxW = x1 - x0 + 1, boxH = y1 - y0 + 1;
console.log(`logo drawn area: ${boxW}x${boxH}px, farthest drawn pixel ${reach.toFixed(1)}px from its centre`);

async function make(size, { safeRadius, maxBox }, outFile) {
  // The larger the logo, the better it reads — limited by the safe circle and by a share of the icon's width/height.
  const scale = Math.min(safeRadius * size / reach, maxBox * size / Math.max(boxW, boxH));
  const w = Math.round(W * scale), h = Math.round(H * scale);
  const logo = await sharp(SOURCE).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
  // Place the logo so the centre of its DRAWN area (not of the image file) is the centre of the icon.
  const left = Math.round(size / 2 - cx * scale), top = Math.round(size / 2 - cy * scale);
  await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([{ input: logo, left, top }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "public", outFile));
  console.log(`wrote public/${outFile} (${size}x${size}, logo scaled to ${(scale * 100).toFixed(0)}%, reach ${(reach * scale / size * 100).toFixed(1)}% of the width)`);
}

// Android: everything inside the 40%-radius safe circle (a little less, for a margin).
await make(512, { safeRadius: 0.385, maxBox: 0.8 }, "icon-maskable-512.png");

// iPhone: the established artwork at exactly 180px (see the header comment).
await sharp(path.join(root, "public", "icon-512.png"))
  .resize(180, 180, { kernel: "lanczos3" })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "apple-touch-icon.png"));
console.log("wrote public/apple-touch-icon.png (180x180, public/icon-512.png scaled down)");
