/**
 * DELETE /api/f30/data/reset
 *
 * Truncates all analytics tables (sessions, events, generation_logs).
 * Requires admin:export permission (highest privilege level).
 * Returns the count of sessions deleted for confirmation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getPool } from "@/lib/db";
import { logAdminEvent } from "@/lib/admin/observability";
import { isDatabaseError } from "@/lib/admin/aggregation";

const NO_STORE = { "Cache-Control": "no-store" };

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const auth = await requireAdminAccess(req, "admin:export");
  if (!auth.ok) return auth.response;

  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ success: false, message: "Analytics not available." }, { status: 503, headers: NO_STORE });
  }

  try {
    const countRes = await pool.query<{ total: string }>("SELECT COUNT(*)::bigint AS total FROM sessions");
    const deletedSessions = Number(countRes.rows[0]?.total ?? 0);

    // TRUNCATE with CASCADE removes sessions + all FK-linked events + generation_logs atomically.
    await pool.query("TRUNCATE TABLE sessions CASCADE");

    logAdminEvent("warn", {
      event: "admin_data_reset",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:export",
      status: 200,
      latencyMs: Date.now() - t0,
      deletedSessions,
    });

    return NextResponse.json(
      { success: true, data: { deletedSessions } },
      { headers: NO_STORE },
    );
  } catch (err) {
    if (isDatabaseError(err)) {
      return NextResponse.json({ success: false, message: "Analytics not available." }, { status: 503, headers: NO_STORE });
    }
    const reason = err instanceof Error ? err.message : "unknown";
    logAdminEvent("error", {
      event: "admin_data_reset_failed",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:export",
      status: 500,
      latencyMs: Date.now() - t0,
      reason,
    });
    return NextResponse.json({ success: false, message: "Failed to reset data." }, { status: 500, headers: NO_STORE });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405, headers: NO_STORE });
}
