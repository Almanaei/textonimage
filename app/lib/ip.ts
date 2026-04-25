/**
 * lib/ip.ts — Client IP extraction for rate limiting.
 *
 * Resolution order (most-reliable first):
 *   1. `x-real-ip`         — set by Vercel and most reverse-proxies to the
 *                            actual client IP, never overrideable by the client.
 *   2. First hop of        — standard proxy chain; the leftmost entry is the
 *      `x-forwarded-for`     originating client IP when the proxy is trusted.
 *
 * ⚠️  The _last_ hop of x-forwarded-for was previously used in this project.
 * On CDN deployments (Vercel, Cloudflare) the last hop is the CDN's own IP,
 * meaning all users would share one rate-limit bucket.  The first hop
 * (appended by the client) can be spoofed, but on Vercel/Cloudflare the
 * incoming x-forwarded-for chain is rewritten by the edge before the app
 * receives it, so the first entry reliably represents the client.
 *
 * For deployments behind an untrusted proxy, configure TRUSTED_PROXY_COUNT
 * and slice from the end by that count.  Not implemented here — use Redis
 * rate limiting at that scale instead.
 */

import { NextRequest } from "next/server";

/**
 * Returns the best-effort client IP from the incoming request headers,
 * or `null` if no IP can be determined.
 */
export function getClientIp(req: NextRequest): string | null {
  // Vercel sets x-real-ip to the connecting client IP (most reliable).
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // Standard proxy chain — take the first (leftmost) entry.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}
