import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminAccess } from "@/lib/admin/auth";
import { buildAdminReport } from "@/lib/admin/aggregation";
import { logAdminEvent } from "@/lib/admin/observability";
import { parseReportsQuery, toAdminDateRange } from "@/lib/admin/schema";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const auth = await requireAdminAccess(req, "admin:read");
  if (!auth.ok) return auth.response;

  try {
    const query = parseReportsQuery(req.nextUrl.searchParams);
    const data = await buildAdminReport(
      toAdminDateRange(query),
      query.includeTrends === "true",
    );
    logAdminEvent("info", {
      event: "admin_reports_success",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 200,
      latencyMs: Date.now() - t0,
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

    if (err instanceof Error && err.message === "Database not configured") {
      return NextResponse.json(
        { success: false, message: "Analytics not available." },
        { status: 503, headers: NO_STORE },
      );
    }

    logAdminEvent("error", {
      event: "admin_reports_failed",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 500,
      latencyMs: Date.now() - t0,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { success: false, message: "Failed to retrieve admin reports." },
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
