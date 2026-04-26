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
    // Both are auto-converted from the source PNGs by Next.js at runtime.
    formats: ["image/avif", "image/webp"],
    // Only generate sizes relevant to a mobile-first single-column layout.
    // Max container is max-w-sm (384px); 2× DPR = 768px; 3× DPR = 1152px.
    deviceSizes: [384, 640, 768, 828, 1080, 1200],
    // Match the display dimensions used in the UI (20px, 384px, 640px)
    imageSizes: [16, 20, 48, 64, 96, 128, 384],
    // Cache optimized AVIF/WebP variants for 1 year on the server.
    // Safe because all changeable assets use versioned filenames (e.g. _v3).
    // Default is 60 seconds which causes constant unnecessary re-encoding.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: staticSecurityHeaders,
      },
      {
        // Static image assets — 7-day browser/CDN cache with background
        // revalidation. Versioned filenames (e.g. _v3.png) bust the cache
        // on update; `immutable` is intentionally omitted so Cloudflare
        // revalidates after a same-named file is replaced.
        // `Vary: Accept` tells Cloudflare to store AVIF and WebP as
        // separate cache entries (Next.js serves different formats based on
        // the browser's Accept header).
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
