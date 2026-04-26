import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminAccess } from "@/lib/admin/auth";
import { buildAdminLocations, isDatabaseError } from "@/lib/admin/aggregation";
import { logAdminEvent } from "@/lib/admin/observability";
import { parseOverviewQuery, toAdminDateRange } from "@/lib/admin/schema";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const auth = await requireAdminAccess(req, "admin:read");
  if (!auth.ok) return auth.response;

  try {
    const query = parseOverviewQuery(req.nextUrl.searchParams);
    const data = await buildAdminLocations(toAdminDateRange(query));
    logAdminEvent("info", {
      event: "admin_locations_success",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 200,
      latencyMs: Date.now() - t0,
      countries: data.topCountries.length,
    });
    return NextResponse.json({ success: true, data }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return NextResponse.json(
        { success: false, message: issue?.message ?? "Invalid query parameters.", field: issue?.path[0] ?? null },
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
      event: "admin_locations_failed",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:read",
      status: 500,
      latencyMs: Date.now() - t0,
      reason,
    });
    return NextResponse.json(
      { success: false, message: "Failed to retrieve location analytics." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405, headers: NO_STORE });
}
