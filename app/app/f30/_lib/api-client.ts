import {
  AdminDateFilter,
  AdminExportFormat,
  AdminGenerationPage,
  AdminLocationSummary,
  AdminOverview,
  AdminReportPayload,
  AdminReportType,
  AdminSessionsPage,
  AdminUsersSummary,
  ApiEnvelope,
} from "./contracts";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function requestAdminJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new AdminApiError(payload?.message ?? "Request failed.", response.status);
  }

  if (!payload?.success || !payload.data) {
    throw new AdminApiError(payload?.message ?? "Unexpected response shape.", response.status);
  }

  return payload.data;
}

export function fetchAdminOverview(filters: AdminDateFilter): Promise<AdminOverview> {
  return requestAdminJson<AdminOverview>(
    `/api/f30/stats/overview${buildQuery({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })}`,
  );
}

export function fetchAdminGenerations(
  params: AdminDateFilter & {
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    success?: "true" | "false";
    errorType?: string;
  },
): Promise<AdminGenerationPage> {
  return requestAdminJson<AdminGenerationPage>(
    `/api/f30/stats/generations${buildQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize,
      sortOrder: params.sortOrder,
      success: params.success,
      errorType: params.errorType,
    })}`,
  );
}

export function fetchAdminUsers(
  params: AdminDateFilter & {
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
  },
): Promise<AdminUsersSummary> {
  return requestAdminJson<AdminUsersSummary>(
    `/api/f30/stats/users${buildQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize,
      sortOrder: params.sortOrder,
    })}`,
  );
}

export function fetchAdminSessions(
  params: AdminDateFilter & {
    page: number;
    pageSize: number;
    sortOrder: "asc" | "desc";
    sortBy: "created_at" | "last_seen_at";
  },
): Promise<AdminSessionsPage> {
  return requestAdminJson<AdminSessionsPage>(
    `/api/f30/stats/sessions${buildQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize,
      sortOrder: params.sortOrder,
      sortBy: params.sortBy,
    })}`,
  );
}

export function fetchAdminLocations(filters: AdminDateFilter): Promise<AdminLocationSummary> {
  return requestAdminJson<AdminLocationSummary>(
    `/api/f30/stats/locations${buildQuery({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })}`,
  );
}

export async function resetAdminData(): Promise<{ deletedSessions: number }> {
  const response = await fetch("/api/f30/data/reset", {
    method: "DELETE",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ deletedSessions: number }> | null;
  if (!response.ok) {
    throw new AdminApiError(payload?.message ?? "Reset failed.", response.status);
  }
  if (!payload?.success || !payload.data) {
    throw new AdminApiError(payload?.message ?? "Unexpected response.", response.status);
  }
  return payload.data;
}

export function fetchAdminReport(filters: AdminDateFilter): Promise<AdminReportPayload> {
  return requestAdminJson<AdminReportPayload>(
    `/api/f30/reports${buildQuery({
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeTrends: "true",
    })}`,
  );
}

export async function exportAdminReport(input: {
  reportType: AdminReportType;
  format: AdminExportFormat;
  filters: AdminDateFilter & { success?: "true" | "false"; errorType?: string };
  page: number;
  pageSize: number;
}): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch("/api/f30/reports/export", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    throw new AdminApiError(payload?.message ?? "Export failed.", response.status);
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const matchedFilename = /filename="([^"]+)"/i.exec(contentDisposition)?.[1];
  const filename =
    matchedFilename ??
    `admin-export-${new Date().toISOString().replace(/[:.]/g, "-")}.${input.format}`;

  return {
    blob: await response.blob(),
    filename,
  };
}
