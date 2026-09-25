import type { NextConfig } from "next";
import path from "node:path";

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
        ],
      },
    ];
  },
};

export default nextConfig;
