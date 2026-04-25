/**
 * T-020 — In-memory rate limiter utility.
 *
 * Sliding-window counter keyed by IP address.
 * Defaults: 10 requests per 60-second window.
 *
 * Note: This is a single-process in-memory implementation suitable for
 * a single-instance deployment. For multi-instance deployments, replace
 * with a Redis-backed solution.
 *
 * Expired entries are evicted on each new-window creation to prevent
 * unbounded memory growth.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

// Operator-configurable via env vars (documented in .env.example).
// Values are read once at module load time; a process restart is required
// to pick up changes.
//
// This limiter is shared by POST /api/admin/auth/login AND POST /api/generate.
//
// ⚠  Shared-NAT / VPN: the key is the caller IP. Multiple operators behind
//    one NAT exit share the same bucket. Raise MAX_REQUESTS (e.g. 50) or
//    ensure X-Forwarded-For carries the real client IP before deploying to
//    an environment where several admins log in from the same egress address.
//    See .docs/admin_dashboard/T-ADM-012_Ops_Runbook.md §2 for full guidance.
//
// ⚠  MULTI_INSTANCE_TODO: counters live in this process only. Replace
//    checkRateLimit() with a Redis-backed implementation before scaling
//    beyond a single Node instance (see T-ADM-012 §6).
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000); // default: 1 minute
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 10); // default: 10 req/window

const store = new Map<string, WindowEntry>();

/** Evict all expired entries from the store. */
function evictExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(key);
    }
  }
}

/** Returns true when the caller is within the allowed rate, false when limited. */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // Evict stale entries when opening a new window to bound memory usage.
    evictExpired(now);
    store.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

/** @internal Reset store for testing only. */
export function _resetStore(): void {
  store.clear();
}
