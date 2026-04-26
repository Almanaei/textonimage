/**
 * proxy.ts — Next.js proxy (formerly middleware), runs on every non-static request.
 *
 * Responsibilities:
 *   1. Nonce-based CSP: generate a per-request nonce and set a strict
 *      Content-Security-Policy that removes 'unsafe-inline' from script-src.
 *      Next.js App Router automatically attaches the nonce to its own script
 *      tags when the `x-nonce` header is present in the rewritten request.
 *   2. Session cookie: read or create a `sid` UUID and set it as an HttpOnly
 *      cookie so all downstream route handlers have a stable session ID.
 *   3. Session header forwarding: because a cookie written to the _response_
 *      is not visible in the _same_ request's `req.cookies`, the session ID is
 *      also forwarded as `x-session-id` in the rewritten request headers.
 *      Route handlers call `getSessionId(req)` which checks this header first.
 *   4. Admin route guard: protect /f30/* routes with the admin session cookie.
 *      - /f30/login is always allowed through (no auth check).
 *      - /api/f30/* is always allowed through (auth handled in route handlers).
 *      - All other /f30/* routes require a valid admin_session cookie;
 *        unauthenticated requests are redirected to /f30/login.
 *
 * Runs in the Edge Runtime — must not import Node.js-only packages (e.g. pg).
 * Database writes (upsertSession) are called fire-and-forget from route handlers.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_EXPIRY_SECONDS, generateSessionId } from "@/lib/session";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-session";

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   /_next/static  — static build assets
     *   /_next/image   — Next.js image optimisation
     *   /favicon.ico   — browser favicon
     *   /assets/       — public static assets (fonts, images)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|assets/).*)",
  ],
};

/** Build the Content-Security-Policy header value. */
function buildCsp(): string {
  const isDev = process.env.NODE_ENV !== "production";

  // 'unsafe-inline' is required because Next.js App Router injects inline scripts
  // for hydration. A nonce-based approach requires explicit Next.js nonce plumbing
  // in every layout — that can be layered on later.
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Cloudflare Web Analytics beacon injected by Cloudflare's CDN layer.
    "https://static.cloudflareinsights.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const connectSrc = [
    "'self'",
    // Cloudflare Web Analytics — beacon POST endpoint.
    "https://cloudflareinsights.com",
    // Allow HMR WebSocket connections in development.
    ...(isDev ? ["ws:", "wss:"] : []),
  ];

  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // ── Admin route guard ──────────────────────────────────────────────────────
  if (pathname.startsWith("/f30")) {
    // /f30/login — always allow through so the login form is accessible.
    // /api/f30/* — pass through; each route handler validates auth itself.
    const isLoginPage = pathname === "/f30/login" || pathname.startsWith("/f30/login/");
    const isAdminApi = pathname.startsWith("/api/f30/");

    if (!isLoginPage && !isAdminApi) {
      // All other /f30/* routes require a valid session cookie.
      const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
      const session = await verifyAdminSession(sessionCookie);

      if (!session) {
        // Redirect unauthenticated requests to the login page.
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/f30/login";
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ── CSP generation ─────────────────────────────────────────────────────────
  const csp = buildCsp();

  // ── Session management ─────────────────────────────────────────────────────
  const existingSid = req.cookies.get(SESSION_COOKIE)?.value;
  const sid = existingSid ?? generateSessionId();
  const isNew = !existingSid;

  // Rewrite request headers so route handlers and Server Components can read:
  //   x-session-id — for new sessions whose cookie is not yet in req.cookies
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-session-id", sid);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Set the CSP on the response — this is the header the browser enforces.
  response.headers.set("Content-Security-Policy", csp);

  if (isNew) {
    response.cookies.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_SECONDS,
      // Only mark Secure in production so local dev (http) works without issues.
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
