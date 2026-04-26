/**
 * POST /api/admin/auth/logout
 *
 * Clears the admin_session cookie, ending the browser session.
 *
 * Responses:
 *   200  { success: true }
 *   405  { success: false, message }  — wrong method
 */

import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/admin-session";
import { logAdminEvent } from "@/lib/admin/observability";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(): Promise<NextResponse> {
  logAdminEvent("info", {
      event: "admin_logout",
      route: "/api/f30/auth/logout",
    status: 200,
  });

  const response = NextResponse.json({ success: true }, { headers: NO_STORE });

  // Expire the cookie immediately by setting Max-Age=0.
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405, headers: NO_STORE });
}
