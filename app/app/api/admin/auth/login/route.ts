/**
 * POST /api/admin/auth/login
 *
 * Accepts { username, password }, verifies against ADMIN_CREDENTIALS,
 * and sets an HttpOnly admin_session cookie on success.
 *
 * Responses:
 *   200  { success: true }              — login OK, cookie set
 *   400  { success: false, message }    — invalid request body
 *   401  { success: false, message }    — wrong username or password
 *   429  { success: false, message }    — too many attempts
 *   500  { success: false, message }    — server error
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminCredentials } from "@/lib/admin/credentials";
import { signAdminSession, adminSessionCookieOptions, ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { readBodyWithLimit, EMPTY_BODY } from "@/lib/read-body";
import { logAdminEvent } from "@/lib/admin/observability";

const BODY_SIZE_LIMIT = 1024; // 1 KB
const NO_STORE = { "Cache-Control": "no-store" };

const LoginBodySchema = z.object({
  username: z.string().trim().min(1, "Username is required.").max(128),
  password: z.string().min(1, "Password is required.").max(256),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limit — keyed by IP to slow brute-force attempts ─────────────────
  const ip = getClientIp(req) ?? "no-ip";
  if (!checkRateLimit(ip)) {
    logAdminEvent("warn", {
      event: "admin_login_rate_limited",
      route: "/api/admin/auth/login",
      status: 429,
    });
    return NextResponse.json(
      { success: false, message: "Too many requests. Please try again later." },
      { status: 429, headers: NO_STORE },
    );
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  const rawBody = await readBodyWithLimit(req, BODY_SIZE_LIMIT);
  if (rawBody === null) {
    return NextResponse.json({ success: false, message: "Request body too large." }, { status: 413, headers: NO_STORE });
  }
  if (rawBody === EMPTY_BODY) {
    return NextResponse.json({ success: false, message: "Request body is required." }, { status: 400, headers: NO_STORE });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400, headers: NO_STORE });
  }

  const parsed = LoginBodySchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, message: issue?.message ?? "Invalid request.", field: issue?.path[0] ?? null },
      { status: 400, headers: NO_STORE },
    );
  }

  // ── Credential verification ────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof verifyAdminCredentials>>;
  try {
    result = await verifyAdminCredentials(parsed.data.username, parsed.data.password);
  } catch (err) {
    logAdminEvent("error", {
      event: "admin_login_error",
      route: "/api/admin/auth/login",
      status: 500,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ success: false, message: "Login service error." }, { status: 500, headers: NO_STORE });
  }

  if (!result.ok) {
    logAdminEvent("warn", {
      event: "admin_login_failed",
      route: "/api/admin/auth/login",
      status: 401,
    });
    return NextResponse.json(
      { success: false, message: "Invalid username or password." },
      { status: 401, headers: NO_STORE },
    );
  }

  // ── Issue session cookie ───────────────────────────────────────────────────
  const token = await signAdminSession({
    username: parsed.data.username,
    role: result.role,
    iat: Date.now(),
  });

  logAdminEvent("info", {
    event: "admin_login_success",
    route: "/api/admin/auth/login",
    role: result.role,
    status: 200,
  });

  const response = NextResponse.json({ success: true }, { headers: NO_STORE });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return response;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405, headers: NO_STORE });
}
