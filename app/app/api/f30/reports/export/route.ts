import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdminAccess } from "@/lib/admin/auth";
import { logAdminEvent } from "@/lib/admin/observability";
import { createExportArtifact, buildReportByType } from "@/lib/admin/reports";
import { AdminExportBodySchema, toAdminDateRange } from "@/lib/admin/schema";
import { readBodyWithLimit } from "@/lib/read-body";

const BODY_SIZE_LIMIT = 2048; // 2 KB
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const auth = await requireAdminAccess(req, "admin:export");
  if (!auth.ok) return auth.response;

  try {
    const rawBody = await readBodyWithLimit(req, BODY_SIZE_LIMIT);
    if (rawBody === null) {
      return NextResponse.json(
        { success: false, message: "Request body too large." },
        { status: 413, headers: NO_STORE },
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload." },
        { status: 400, headers: NO_STORE },
      );
    }

    const parsed = AdminExportBodySchema.parse(raw);
    const range = toAdminDateRange(parsed.filters);
    const payload = await buildReportByType({
      reportType: parsed.reportType,
      format: parsed.format,
      range,
      page: parsed.page,
      pageSize: parsed.pageSize,
      success: parsed.filters.success,
      errorType: parsed.filters.errorType,
    });

    const artifact = createExportArtifact(payload, parsed.reportType, parsed.format);
    logAdminEvent("info", {
      event: "admin_export_success",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:export",
      status: 200,
      latencyMs: Date.now() - t0,
      reportType: parsed.reportType,
      format: parsed.format,
    });

    return new NextResponse(artifact.body, {
      status: 200,
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: issue?.message ?? "Validation failed.",
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
      event: "admin_export_failed",
      route: req.nextUrl.pathname,
      role: auth.context.role,
      permission: "admin:export",
      status: 500,
      latencyMs: Date.now() - t0,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { success: false, message: "Failed to export admin report." },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth gate runs before the method check so unauthorized callers always
  // see 401 — prevents leaking which methods the route exposes.
  const auth = await requireAdminAccess(req, "admin:export");
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405, headers: NO_STORE },
  );
}
