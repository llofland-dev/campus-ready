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
};

export default nextConfig;
