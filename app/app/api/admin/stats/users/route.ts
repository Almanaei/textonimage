import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminAccess } from "@/lib/admin/auth";
import { buildAdminUsers, isDatabaseError } from "@/lib/admin/aggregation";
import { logAdminEvent } from "@/lib/admin/observability";
import { parseUsersQuery, toAdminDateRange } from "@/lib/admin/schema";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const auth = await requireAdminAccess(req, "admin:read");
  if (!auth.ok) return auth.response;

  try {
    const query = parseUsersQuery(req.nextUrl.searchParams);
    const data = await buildAdminUsers({
      range: toAdminDateRange(query),
      page: query.page,
      pageSize: query.pageSize,
      sortOrder: query.sortOrder,
    });
    logAdminEvent("info", {
      event: "admin_users_success",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 200,
      latencyMs: Date.now() - t0,
      rows: data.trend.length,
    });
    return NextResponse.json({ success: true, data }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: issue?.message ?? "Invalid query parameters.",
          field: issue?.path[0] ?? null,
        },
        { status: 400, headers: NO_STORE },
      );
    }

    if (isDatabaseError(err)) {
      return NextResponse.json(
        { success: false, message: "Analytics not available." },
        { status: 503, headers: NO_STORE },
      );
    }

    const reason = err instanceof Error
      ? (err.message || (err as NodeJS.ErrnoException).code || err.constructor.name)
      : "unknown";
    logAdminEvent("error", {
      event: "admin_users_failed",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 500,
      latencyMs: Date.now() - t0,
      reason: reason ?? "unknown",
    });
    return NextResponse.json(
      { success: false, message: "Failed to retrieve user analytics." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405, headers: NO_STORE },
  );
}
