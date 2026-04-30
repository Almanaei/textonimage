/**
 * lib/admin/reports.ts — Admin reporting/export helpers.
 */

import {
  buildAdminGenerations,
  buildAdminOverview,
  buildAdminReport,
  buildAdminSessions,
  buildAdminUsers,
} from "@/lib/admin/aggregation";
import { AdminDateRange } from "@/lib/admin/schema";

export type AdminReportType = "overview" | "generations" | "users" | "sessions" | "full";
export type AdminExportFormat = "json" | "csv";

interface BuildReportInput {
  reportType: AdminReportType;
  format: AdminExportFormat;
  range: AdminDateRange;
  page: number;
  pageSize: number;
  success?: "true" | "false";
  errorType?: string;
}

export async function buildReportByType(input: BuildReportInput): Promise<unknown> {
  if (input.reportType === "overview") {
    return buildAdminOverview(input.range);
  }

  if (input.reportType === "generations") {
    return buildAdminGenerations({
      range: input.range,
      page: input.page,
      pageSize: input.pageSize,
      sortOrder: "desc",
      success: input.success,
      errorType: input.errorType,
    });
  }

  if (input.reportType === "users") {
    return buildAdminUsers({
      range: input.range,
      page: input.page,
      pageSize: input.pageSize,
      sortOrder: "desc",
    });
  }

  if (input.reportType === "sessions") {
    return buildAdminSessions({
      range: input.range,
      page: input.page,
      pageSize: input.pageSize,
      sortBy: "last_seen_at",
      sortOrder: "desc",
    });
  }

  // "full" report: for CSV export return generation rows so name/email are
  // included as proper columns; for JSON return the full aggregated payload.
  if (input.format === "csv") {
    return buildAdminGenerations({
      range: input.range,
      page: input.page,
      pageSize: input.pageSize,
      sortOrder: "desc",
      success: input.success,
      errorType: input.errorType,
    });
  }

  return buildAdminReport(input.range, true);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replaceAll("\"", "\"\"")}"`;
  }
  return raw;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "message\nno_data\n";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function flattenObject(prefix: string, value: unknown, out: Record<string, unknown>[]): void {
  if (value === null || value === undefined) {
    out.push({ field: prefix, value: "" });
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({ field: prefix, value: "[]" });
      return;
    }
    for (let i = 0; i < value.length; i++) {
      flattenObject(`${prefix}[${i}]`, value[i], out);
    }
    return;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      out.push({ field: prefix, value: "{}" });
      return;
    }
    for (const [key, child] of entries) {
      flattenObject(prefix ? `${prefix}.${key}` : key, child, out);
    }
    return;
  }

  out.push({ field: prefix, value });
}

function normalizeForCsv(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [{ value: payload ?? "" }];
  }

  const data = payload as Record<string, unknown>;

  // Paginated list responses (generations, sessions)
  if (Array.isArray(data.rows)) {
    return data.rows as Record<string, unknown>[];
  }

  // Users summary: prepend one aggregate-totals row, then daily trend rows.
  // Without this, normalizeForCsv would silently discard data.summary.
  if (
    data.summary &&
    typeof data.summary === "object" &&
    Array.isArray(data.trend)
  ) {
    const summaryRow = { date: "TOTALS", ...(data.summary as Record<string, unknown>) };
    return [summaryRow, ...(data.trend as Record<string, unknown>[])];
  }

  if (Array.isArray(data.trend)) {
    return data.trend as Record<string, unknown>[];
  }

  const flattened: Record<string, unknown>[] = [];
  flattenObject("", payload, flattened);
  return flattened;
}

export function createExportArtifact(
  payload: unknown,
  reportType: AdminReportType,
  format: AdminExportFormat,
): { contentType: string; filename: string; body: string } {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (format === "json") {
    return {
      contentType: "application/json; charset=utf-8",
      filename: `admin-${reportType}-${stamp}.json`,
      body: `${JSON.stringify(payload, null, 2)}\n`,
    };
  }

  const rows = normalizeForCsv(payload);
  return {
    contentType: "text/csv; charset=utf-8",
    filename: `admin-${reportType}-${stamp}.csv`,
    body: toCsv(rows),
  };
}

