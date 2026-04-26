/**
 * lib/admin/observability.ts — Structured logs for admin endpoints.
 *
 * Important: Never log PII (name, email, raw tokens, session IDs).
 */

type LogLevel = "info" | "warn" | "error";

interface AdminLogPayload {
  event: string;
  route: string;
  role?: string;
  permission?: string;
  status?: number;
  latencyMs?: number;
  reportType?: string;
  format?: string;
  rows?: number;
  reason?: string;
  deletedSessions?: number;
  countries?: number;
}

export function logAdminEvent(level: LogLevel, payload: AdminLogPayload): void {
  const base = {
    scope: "admin_api",
    ...payload,
  };

  if (level === "warn") {
    console.warn("[admin]", base);
    return;
  }

  if (level === "error") {
    console.error("[admin]", base);
    return;
  }

  console.info("[admin]", base);
}

