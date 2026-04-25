import type { NextConfig } from "next";

// Non-CSP security headers that are safe to set statically at build time.
// CSP is intentionally omitted here — it is set per-request in proxy.ts
// (the Next.js proxy layer) with a dynamic policy based on the environment.
const staticSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "pg"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
