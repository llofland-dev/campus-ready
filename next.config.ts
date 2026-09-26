import type { NextConfig } from "next";
import path from "node:path";

// Content-Security-Policy: tells the browser where this app may load things from, so an injected script or a
// stray external image can't phone home. Production only — the dev server needs looser rules (eval for hot
// reload, a websocket) and would break under this.
//   * script/style 'unsafe-inline': Next.js writes small inline bootstrap scripts and Tailwind writes style
//     attributes; nonces would force every page to render dynamically. The directives that matter most here
//     are the others: no framing (frame-ancestors), no plugins (object-src), no <base> hijack, forms and network
//     calls only to ourselves and our own Supabase project, images only from ourselves and Supabase Storage.
//   * No `upgrade-insecure-requests`: HSTS already forces HTTPS in production, and that directive rewrites
//     http://localhost requests, which breaks the service worker when a production build is tested locally.
//   * External images typed into a plan page are therefore blocked (also stops tracking pixels on the
//     public family page).
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.replace(/\s+/g, " ").trim(),
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Without this, Turbopack infers the workspace root from a repo-root
  // package-lock.json (e.g. one added for the Supabase CLI) instead of this
  // directory, and silently fails to pick up proxy.ts.
  turbopack: {
    root: path.join(__dirname),
  },
  // Dev-only: lets phones on the same LAN load JS/HMR assets when testing
  // against this machine's network IP instead of localhost.
  allowedDevOrigins: ["10.0.0.23"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // The app is never meant to be embedded in another site's frame.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here uses the camera, microphone, or location.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // EOP_DISABLE_CSP=1 (a Vercel environment variable, then redeploy) is the emergency switch if the policy
          // ever blocks something it shouldn't — see docs/SECURITY.md.
          ...(process.env.NODE_ENV === "production" && process.env.EOP_DISABLE_CSP !== "1" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
