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
    // 1-year server-side cache for versioned assets (form.png, template.png).
    // welcome_screen.png is served with `unoptimized` so it bypasses this cache.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
      {
        // All static assets — 7-day CDN cache with background revalidation.
        // Vary: Accept tells Cloudflare to store AVIF and WebP as separate entries.
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
        // welcome_screen.png and form.png are mutable files — replaced in-place
        // on design updates without renaming. Both rules MUST appear AFTER the
        // /assets/:path* rule above so they override Cache-Control for those paths.
        // no-store: never cache — always fetch from origin on every request.
        // Combined with `unoptimized` on the <Image> component, any update is live
        // for all users immediately after deploy with zero CDN purging required.
        source: "/assets/welcome_screen.png",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/assets/form.png",
        headers: [{ key: "Cache-Control", value: "no-store" }],
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
