/**
 * lib/session.ts — Server-side session helpers.
 *
 * Sessions are identified by a UUID stored in an HttpOnly cookie set by
 * middleware.ts on every request.
 *
 * On a user's very first request the cookie has just been written to the
 * _response_ by middleware, so it is not yet present in `req.cookies`.
 * To close this gap, middleware also forwards the session ID as the
 * `x-session-id` request header.  `getSessionId` checks that header first.
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "sid";
export const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Internal header name used by middleware to forward the session ID. */
const SESSION_HEADER = "x-session-id";

/**
 * Returns the session ID for a Route Handler request.
 *
 * Resolution order:
 *   1. `x-session-id` header (set by middleware; covers new sessions whose
 *      cookie is not yet in the browser's jar)
 *   2. `sid` cookie (all subsequent requests)
 */
export function getSessionId(req: NextRequest): string | null {
  return req.headers.get(SESSION_HEADER) ?? req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Returns the session ID from the Next.js cookies() API.
 * Used inside Server Components or Server Actions.
 */
export async function getSessionIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Generates a new RFC 4122 v4 UUID for use as a session ID.
 * Uses the Web Crypto API (available in Node 20+ and Edge runtime).
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}
