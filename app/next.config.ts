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
  images: {
    // Serve AVIF first (30-50% smaller than WebP), fall back to WebP.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 768, 828, 1080, 1200],
    imageSizes: [16, 20, 48, 64, 96, 128, 384],
    // 1-year server-side cache for versioned assets (e.g. form_v2.png, template.png).
    // welcome_screen.png is served with `unoptimized` so it bypasses this cache entirely.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
      {
        // All other static assets — 7-day CDN cache. Versioned filenames
        // (form_v2.png, template.png, etc.) bust the cache on update.
        // Vary: Accept ensures Cloudflare stores AVIF and WebP separately.
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
          {
            key: "Vary",
            value: "Accept",
          },
        ],
      },
      {
        // welcome_screen.png is a mutable file (replaced without renaming).
        // This rule MUST come after the /assets/:path* rule above so it wins
        // for duplicate Cache-Control keys (Next.js applies last match).
        // no-store: do not cache at all — always fetch from origin.
        // This guarantees Cloudflare and browsers never serve a stale copy.
        source: "/assets/welcome_screen.png",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // Next.js image optimization endpoint — same Vary requirement.
        // The /_next/image URL serves different formats (AVIF/WebP/original)
        // based on Accept header; Cloudflare must not collapse them.
        source: "/_next/image",
        headers: [
          {
            key: "Vary",
            value: "Accept",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
