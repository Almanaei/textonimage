export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  field?: string | null;
}

export interface AdminDateFilter {
  startDate?: string;
  endDate?: string;
}

export interface AdminOverview {
  generatedAt: string;
  filters: {
    startDate: string | null;
    endDate: string | null;
  };
  totals: {
    visitors: number;
    sessions: number;
    generations: number;
    successfulGenerations: number;
    failedGenerations: number;
    conversionRate: number;
    avgGenerationTimeMs: number;
    rateLimitedRequests: number;
  };
}

export interface AdminGenerationRow {
  id: string;
  sessionId: string;
  success: boolean;
  durationMs: number;
  errorType: string | null;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export interface AdminGenerationPage {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  rows: AdminGenerationRow[];
}

export interface AdminUsersSummary {
  generatedAt: string;
  page: number;
  pageSize: number;
  totalDays: number;
  filters: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    newUsers: number;
    activeUsers: number;
    returningUsers: number;
    pageViews: number;
    downloadClicks: number;
  };
  trend: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
}

export interface AdminSessionRow {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  eventCount: number;
  generationCount: number;
  successfulGenerationCount: number;
}

export interface AdminSessionsPage {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  rows: AdminSessionRow[];
}

export interface AdminReportPayload {
  generatedAt: string;
  overview: AdminOverview;
  generations: {
    daily: Array<{
      date: string;
      total: number;
      successful: number;
      failed: number;
    }>;
    errors: Array<{
      errorType: string | null;
      count: number;
    }>;
  };
  users: {
    dailySessions: Array<{
      date: string;
      sessions: number;
    }>;
  };
}

export type AdminReportType = "overview" | "generations" | "users" | "sessions" | "full";
export type AdminExportFormat = "json" | "csv";
