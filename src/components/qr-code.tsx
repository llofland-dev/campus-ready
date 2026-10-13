import qrcode from "qrcode-generator";

// A QR code drawn as inline SVG straight from the code's module matrix — no raw HTML is injected, no
// image file is fetched (so the Content-Security-Policy's `img-src` never comes into it), and it renders on
// the server, so it also appears with JavaScript off and inside the offline copy of the page.
//
// Always black on white with a four-module quiet zone, whatever the page theme: scanners need dark modules
// on a light background, so a dark-mode "inverted" code would simply not scan. Error correction level M
// (about 15% of the code can be damaged or covered and it still reads).
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = qrcode(0, "M"); // type 0 = pick the smallest version that fits the text
  qr.addData(value);
  qr.make();

  const count = qr.getModuleCount();
  const margin = 4;
  // One horizontal run of dark modules per path segment keeps the markup small (a few KB).
  let path = "";
  for (let row = 0; row < count; row++) {
    let col = 0;
    while (col < count) {
      if (!qr.isDark(row, col)) {
        col++;
        continue;
      }
      let run = 1;
      while (col + run < count && qr.isDark(row, col + run)) run++;
      path += `M${col + margin} ${row + margin}h${run}v1h-${run}z`;
      col += run;
    }
  }

  const size = count + margin * 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className}>
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
