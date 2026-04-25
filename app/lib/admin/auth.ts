/**
 * lib/admin/auth.ts — Admin API authentication and authorization helpers.
 *
 * Accepts two auth paths:
 *   1. admin_session cookie — issued by POST /api/admin/auth/login (browser access).
 *   2. Authorization: Bearer <token> — from ADMIN_API_KEYS env var (script/automation access).
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin/observability";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-session";

export type AdminRole = "viewer" | "analyst" | "operator" | "admin";
export type AdminPermission = "admin:read" | "admin:export";

interface AdminPrincipal {
  role: AdminRole;
  token: string;
}

interface FailedAuthWindow {
  count: number;
  windowStart: number;
}

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  viewer: new Set(["admin:read"]),
  analyst: new Set(["admin:read"]),
  operator: new Set(["admin:read", "admin:export"]),
  admin: new Set(["admin:read", "admin:export"]),
};

const VALID_ROLES = new Set<AdminRole>(["viewer", "analyst", "operator", "admin"]);
// ⚠  Shared-NAT / VPN: key is caller IP; see T-ADM-012_Ops_Runbook §2.
// ⚠  MULTI_INSTANCE_TODO: in-process Map — not shared across instances.
//    Replace failedAuthStore with a Redis-backed counter before horizontal scaling.
const ADMIN_AUTH_WINDOW_MS = Number(process.env.ADMIN_AUTH_WINDOW_MS ?? 60_000);
const ADMIN_AUTH_MAX_ATTEMPTS = Number(process.env.ADMIN_AUTH_MAX_ATTEMPTS ?? 30);
const failedAuthStore = new Map<string, FailedAuthWindow>();

function toUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function toForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Forbidden" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

function toTooManyRequestsResponse(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Too many failed authentication attempts. Try again later." },
    { status: 429, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Fixed-key HMAC used as the comparison key so neither `expected` nor
 * `provided` influences the key length.  The key is arbitrary — its purpose
 * is only to make both digests exactly 32 bytes so `timingSafeEqual` never
 * throws on length mismatch.  Actual secrecy is provided by the tokens
 * themselves, not by this key.
 */
const HMAC_COMPARE_KEY = Buffer.from("admin-token-comparison-key-v1-fixed", "utf8");

function timingSafeTokenEquals(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedDigest = createHmac("sha256", HMAC_COMPARE_KEY).update(expected).digest();
  const providedDigest = createHmac("sha256", HMAC_COMPARE_KEY).update(provided).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

export function parseAdminApiKeys(raw: string): AdminPrincipal[] {
  if (!raw.trim()) return [];

  const parsed: AdminPrincipal[] = [];
  for (const chunk of raw.split(",")) {
    const item = chunk.trim();
    if (!item) continue;

    const separatorIndex = item.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === item.length - 1) {
      throw new Error("ADMIN_API_KEYS entry must be in role:token format.");
    }

    const maybeRole = item.slice(0, separatorIndex).trim();
    const token = item.slice(separatorIndex + 1).trim();

    if (!VALID_ROLES.has(maybeRole as AdminRole)) {
      throw new Error(`Unknown admin role "${maybeRole}" in ADMIN_API_KEYS.`);
    }
    if (!token) {
      throw new Error(`Empty token configured for admin role "${maybeRole}".`);
    }

    parsed.push({ role: maybeRole as AdminRole, token });
  }

  return parsed;
}

const ADMIN_API_KEYS = process.env.ADMIN_API_KEYS ?? "";
const ADMIN_PRINCIPALS = parseAdminApiKeys(ADMIN_API_KEYS);

if (process.env.NODE_ENV === "production") {
  for (const principal of ADMIN_PRINCIPALS) {
    if (principal.token.length < 32) {
      throw new Error(
        `ADMIN_API_KEYS token for role "${principal.role}" must be at least 32 characters in production.`,
      );
    }
  }
}

if (ADMIN_PRINCIPALS.length === 0) {
  console.warn("[admin] ADMIN_API_KEYS is empty. Bearer token auth will deny all requests. Browser login is still available.");
}

export interface AdminAuthContext {
  role: AdminRole;
}

function evictExpired(now: number): void {
  for (const [key, value] of failedAuthStore) {
    if (now - value.windowStart >= ADMIN_AUTH_WINDOW_MS) {
      failedAuthStore.delete(key);
    }
  }
}

export function checkAdminAuthRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const entry = failedAuthStore.get(clientKey);
  if (!entry || now - entry.windowStart >= ADMIN_AUTH_WINDOW_MS) {
    evictExpired(now);
    failedAuthStore.set(clientKey, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= ADMIN_AUTH_MAX_ATTEMPTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

function resetFailedAuthCounter(clientKey: string): void {
  failedAuthStore.delete(clientKey);
}

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (forwardedFor) return `ip:${forwardedFor}`;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

  const sid = req.cookies.get("sid")?.value;
  if (sid) return `sid:${sid}`;

  return "client:unknown";
}

/** @internal Test helper. */
export function _resetAdminAuthStore(): void {
  failedAuthStore.clear();
}

export function authorizeAdminToken(
  authHeader: string | null,
  requiredPermission: AdminPermission,
  principals: AdminPrincipal[] = ADMIN_PRINCIPALS,
): { ok: true; context: AdminAuthContext } | { ok: false; status: 401 | 403 } {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false, status: 401 };
  }

  for (const principal of principals) {
    if (!timingSafeTokenEquals(principal.token, token)) {
      continue;
    }

    const allowedPermissions = ROLE_PERMISSIONS[principal.role];
    if (!allowedPermissions.has(requiredPermission)) {
      return { ok: false, status: 403 };
    }

    return { ok: true, context: { role: principal.role } };
  }

  return { ok: false, status: 401 };
}

/**
 * Verify an admin_session cookie and authorize by role permissions.
 * Returns the auth context on success, or a status code on failure.
 */
async function authorizeAdminSession(
  req: NextRequest,
  requiredPermission: AdminPermission,
): Promise<{ ok: true; context: AdminAuthContext } | { ok: false; status: 401 | 403 }> {
  const cookieValue = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookieValue) return { ok: false, status: 401 };

  const session = await verifyAdminSession(cookieValue);
  if (!session) return { ok: false, status: 401 };

  const allowedPermissions = ROLE_PERMISSIONS[session.role];
  if (!allowedPermissions.has(requiredPermission)) {
    return { ok: false, status: 403 };
  }

  return { ok: true, context: { role: session.role } };
}

export async function requireAdminAccess(
  req: NextRequest,
  requiredPermission: AdminPermission,
): Promise<{ ok: true; context: AdminAuthContext } | { ok: false; response: NextResponse }> {
  const route = req.nextUrl.pathname;
  const clientKey = getClientKey(req);

  // ── Path 1: admin_session cookie (browser login) ───────────────────────────
  const sessionResult = await authorizeAdminSession(req, requiredPermission);
  if (sessionResult.ok) {
    resetFailedAuthCounter(clientKey);
    return sessionResult;
  }

  // ── Path 2: Authorization: Bearer token (scripts/automation) ───────────────
  const bearerResult = authorizeAdminToken(req.headers.get("authorization"), requiredPermission);
  if (bearerResult.ok) {
    resetFailedAuthCounter(clientKey);
    return bearerResult;
  }

  // ── Auth failed — apply rate limiting and return error ─────────────────────
  if (!checkAdminAuthRateLimit(clientKey)) {
    logAdminEvent("warn", {
      event: "admin_auth_rate_limited",
      route,
      permission: requiredPermission,
      status: 429,
    });
    return { ok: false, response: toTooManyRequestsResponse() };
  }

  // Prefer the session result's status over the bearer result's status so that
  // a 403 (role insufficient) from the session path surfaces correctly.
  const failStatus = sessionResult.status === 403 || bearerResult.status === 403 ? 403 : 401;

  if (failStatus === 403) {
    logAdminEvent("warn", {
      event: "admin_access_forbidden",
      route,
      permission: requiredPermission,
      status: 403,
    });
    return { ok: false, response: toForbiddenResponse() };
  }

  logAdminEvent("warn", {
    event: "admin_access_unauthorized",
    route,
    permission: requiredPermission,
    status: 401,
  });
  return { ok: false, response: toUnauthorizedResponse() };
}
