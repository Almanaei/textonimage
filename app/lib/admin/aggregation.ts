/**
 * lib/admin/aggregation.ts — Aggregation queries for admin dashboard APIs.
 */

import { getPool } from "@/lib/db";
import { AdminDateRange } from "@/lib/admin/schema";

interface WhereClause {
  where: string;
  params: unknown[];
}

function assertPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error("Database not configured");
  }
  return pool;
}

function toCount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/** Columns that may be used as date filter targets. Allowlist prevents SQL injection. */
const ALLOWED_DATE_COLUMNS = new Set(["created_at", "last_seen_at"]);

function buildDateRangeWhere(range: AdminDateRange, column = "created_at"): WhereClause {
  if (!ALLOWED_DATE_COLUMNS.has(column)) {
    throw new Error(`Invalid date column: "${column}"`);
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (range.startAt) {
    conditions.push(`${column} >= $${params.push(range.startAt.toISOString())}`);
  }
  if (range.endAt) {
    conditions.push(`${column} <= $${params.push(range.endAt.toISOString())}`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
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

export async function buildAdminOverview(range: AdminDateRange): Promise<AdminOverview> {
  const pool = assertPool();
  const sessionFilter = buildDateRangeWhere(range, "created_at");
  const eventFilter = buildDateRangeWhere(range, "created_at");
  const generationFilter = buildDateRangeWhere(range, "created_at");

  const [sessionsRes, visitorsRes, generationRes, rateLimitedRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM sessions
       ${sessionFilter.where}`,
      sessionFilter.params,
    ),
    pool.query<{ visitors: string }>(
      `SELECT COALESCE(COUNT(DISTINCT session_id), 0) AS visitors
       FROM events
       ${eventFilter.where ? `${eventFilter.where} AND event_type = 'page_view'` : "WHERE event_type = 'page_view'"}`,
      eventFilter.params,
    ),
    pool.query<{
      total: string;
      successful: string;
      avg_duration_ms: string;
      converting_sessions: string;
    }>(
      `SELECT
         COUNT(*)                                                         AS total,
         COUNT(*) FILTER (WHERE success = true)                           AS successful,
         COALESCE(AVG(duration_ms), 0)                                    AS avg_duration_ms,
         COUNT(DISTINCT session_id) FILTER (WHERE success = true)::bigint AS converting_sessions
       FROM generation_logs
       ${generationFilter.where}`,
      generationFilter.params,
    ),
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM events
       ${eventFilter.where ? `${eventFilter.where} AND event_type = 'rate_limited'` : "WHERE event_type = 'rate_limited'"}`,
      eventFilter.params,
    ),
  ]);

  const sessions = toCount(sessionsRes.rows[0]?.total);
  const visitors = toCount(visitorsRes.rows[0]?.visitors);
  const totalGenerations = toCount(generationRes.rows[0]?.total);
  const successfulGenerations = toCount(generationRes.rows[0]?.successful);
  const failedGenerations = Math.max(0, totalGenerations - successfulGenerations);
  const rateLimitedRequests = toCount(rateLimitedRes.rows[0]?.total);

  // Conversion rate semantics: of all unique visitors/sessions in the window,
  // what % had at least one successful generation. Numerator is distinct
  // sessions that converted, not raw generation count, so the rate cannot
  // exceed 100% even when one session generates many successful images.
  const convertingSessions = toCount(generationRes.rows[0]?.converting_sessions);
  const conversionBase = visitors > 0 ? visitors : sessions;
  const rawRate = conversionBase === 0 ? 0 : (convertingSessions / conversionBase) * 100;
  const conversionRate = Math.max(0, Math.min(100, Math.round(rawRate)));

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      startDate: range.startAt?.toISOString() ?? null,
      endDate: range.endAt?.toISOString() ?? null,
    },
    totals: {
      visitors,
      sessions,
      generations: totalGenerations,
      successfulGenerations,
      failedGenerations,
      conversionRate,
      avgGenerationTimeMs: Math.round(toCount(generationRes.rows[0]?.avg_duration_ms)),
      rateLimitedRequests,
    },
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

interface GenerationFilters {
  range: AdminDateRange;
  page: number;
  pageSize: number;
  sortOrder: "asc" | "desc";
  success?: "true" | "false";
  errorType?: string;
}

function buildGenerationFilter(filters: GenerationFilters): WhereClause {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.range.startAt) {
    conditions.push(`created_at >= $${params.push(filters.range.startAt.toISOString())}`);
  }
  if (filters.range.endAt) {
    conditions.push(`created_at <= $${params.push(filters.range.endAt.toISOString())}`);
  }
  if (filters.success) {
    conditions.push(`success = $${params.push(filters.success === "true")}`);
  }
  if (filters.errorType) {
    conditions.push(`error_type = $${params.push(filters.errorType)}`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export async function buildAdminGenerations(filters: GenerationFilters): Promise<AdminGenerationPage> {
  const pool = assertPool();
  const where = buildGenerationFilter(filters);
  const order = filters.sortOrder === "asc" ? "ASC" : "DESC";
  const offset = (filters.page - 1) * filters.pageSize;

  const [countRes, rowsRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM generation_logs
       ${where.where}`,
      where.params,
    ),
    pool.query<{
      id: string;
      session_id: string;
      success: boolean;
      duration_ms: number;
      error_type: string | null;
      name: string | null;
      email: string | null;
      created_at: string;
    }>(
      `SELECT id, session_id, success, duration_ms, error_type, name, email, created_at
       FROM generation_logs
       ${where.where}
       ORDER BY created_at ${order}
       LIMIT $${where.params.length + 1}
       OFFSET $${where.params.length + 2}`,
      [...where.params, filters.pageSize, offset],
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    page: filters.page,
    pageSize: filters.pageSize,
    total: toCount(countRes.rows[0]?.total),
    rows: rowsRes.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      success: row.success,
      durationMs: row.duration_ms,
      errorType: row.error_type,
      name: row.name,
      email: row.email,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  };
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

interface UsersFilters {
  range: AdminDateRange;
  page: number;
  pageSize: number;
  sortOrder: "asc" | "desc";
}

export async function buildAdminUsers(filters: UsersFilters): Promise<AdminUsersSummary> {
  const pool = assertPool();
  const sessionWhere = buildDateRangeWhere(filters.range, "created_at");
  const eventWhere = buildDateRangeWhere(filters.range, "created_at");
  const order = filters.sortOrder === "asc" ? "ASC" : "DESC";
  const offset = (filters.page - 1) * filters.pageSize;
  const rangeStartIso = filters.range.startAt?.toISOString() ?? null;

  const [summaryRes, newUsersTrendRes, activeUsersTrendRes, totalDaysRes] = await Promise.all([
    pool.query<{
      new_users: string;
      active_users: string;
      returning_users: string;
      page_views: string;
      download_clicks: string;
    }>(
      `SELECT
         (
           SELECT COUNT(*)::bigint
           FROM sessions
           ${sessionWhere.where}
         ) AS new_users,
         (
           SELECT COUNT(DISTINCT e.session_id)::bigint
           FROM events e
           ${eventWhere.where.replaceAll("created_at", "e.created_at")}
         ) AS active_users,
         (
           SELECT COALESCE(COUNT(DISTINCT e.session_id), 0)::bigint
           FROM events e
           JOIN sessions s ON s.id = e.session_id
           ${eventWhere.where ? `${eventWhere.where.replaceAll("created_at", "e.created_at")} AND` : "WHERE"}
           s.created_at < COALESCE($${eventWhere.params.length + 1}::timestamptz, s.created_at)
         ) AS returning_users,
         (
           SELECT COALESCE(COUNT(*), 0)::bigint
           FROM events e
           ${eventWhere.where ? `${eventWhere.where.replaceAll("created_at", "e.created_at")} AND e.event_type = 'page_view'` : "WHERE e.event_type = 'page_view'"}
         ) AS page_views,
         (
           SELECT COALESCE(COUNT(*), 0)::bigint
           FROM events e
           ${eventWhere.where ? `${eventWhere.where.replaceAll("created_at", "e.created_at")} AND e.event_type = 'download_clicked'` : "WHERE e.event_type = 'download_clicked'"}
         ) AS download_clicks`,
      [...eventWhere.params, rangeStartIso],
    ),
    pool.query<{ date: string; total: string }>(
      `SELECT DATE(created_at)::text AS date, COUNT(*)::bigint AS total
       FROM sessions
       ${sessionWhere.where}
       GROUP BY DATE(created_at)
       ORDER BY date ${order}
       LIMIT $${sessionWhere.params.length + 1}
       OFFSET $${sessionWhere.params.length + 2}`,
      [...sessionWhere.params, filters.pageSize, offset],
    ),
    pool.query<{ date: string; total: string }>(
      `SELECT DATE(created_at)::text AS date, COUNT(DISTINCT session_id)::bigint AS total
       FROM events
       ${eventWhere.where}
       GROUP BY DATE(created_at)
       ORDER BY date ${order}
       LIMIT $${eventWhere.params.length + 1}
       OFFSET $${eventWhere.params.length + 2}`,
      [...eventWhere.params, filters.pageSize, offset],
    ),
    pool.query<{ total: string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM (
         SELECT DATE(created_at)
         FROM sessions
         ${sessionWhere.where}
         GROUP BY DATE(created_at)
       ) AS daily_sessions`,
      sessionWhere.params,
    ),
  ]);

  const activityByDate = new Map<string, { newUsers: number; activeUsers: number }>();
  for (const row of newUsersTrendRes.rows) {
    activityByDate.set(row.date, { newUsers: toCount(row.total), activeUsers: 0 });
  }
  for (const row of activeUsersTrendRes.rows) {
    const current = activityByDate.get(row.date) ?? { newUsers: 0, activeUsers: 0 };
    current.activeUsers = toCount(row.total);
    activityByDate.set(row.date, current);
  }

  return {
    generatedAt: new Date().toISOString(),
    page: filters.page,
    pageSize: filters.pageSize,
    totalDays: toCount(totalDaysRes.rows[0]?.total),
    filters: {
      startDate: filters.range.startAt?.toISOString() ?? null,
      endDate: filters.range.endAt?.toISOString() ?? null,
    },
    summary: {
      newUsers: toCount(summaryRes.rows[0]?.new_users),
      activeUsers: toCount(summaryRes.rows[0]?.active_users),
      returningUsers: toCount(summaryRes.rows[0]?.returning_users),
      pageViews: toCount(summaryRes.rows[0]?.page_views),
      downloadClicks: toCount(summaryRes.rows[0]?.download_clicks),
    },
    trend: Array.from(activityByDate.entries()).map(([date, totals]) => ({
      date,
      newUsers: totals.newUsers,
      activeUsers: totals.activeUsers,
    })),
  };
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

interface SessionsFilters {
  range: AdminDateRange;
  page: number;
  pageSize: number;
  sortBy: "created_at" | "last_seen_at";
  sortOrder: "asc" | "desc";
}

export async function buildAdminSessions(filters: SessionsFilters): Promise<AdminSessionsPage> {
  const pool = assertPool();
  const where = buildDateRangeWhere(filters.range, "created_at");
  const order = filters.sortOrder === "asc" ? "ASC" : "DESC";
  const offset = (filters.page - 1) * filters.pageSize;

  const [countRes, rowsRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM sessions s
       ${where.where}`,
      where.params,
    ),
    pool.query<{
      id: string;
      created_at: string;
      last_seen_at: string;
      event_count: string;
      generation_count: string;
      success_count: string;
    }>(
      `SELECT
         s.id,
         s.created_at,
         s.last_seen_at,
         (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) AS event_count,
         (SELECT COUNT(*) FROM generation_logs g WHERE g.session_id = s.id) AS generation_count,
         (
           SELECT COUNT(*)
           FROM generation_logs g
           WHERE g.session_id = s.id AND g.success = true
         ) AS success_count
       FROM sessions s
       ${where.where}
       ORDER BY s.${filters.sortBy} ${order}
       LIMIT $${where.params.length + 1}
       OFFSET $${where.params.length + 2}`,
      [...where.params, filters.pageSize, offset],
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    page: filters.page,
    pageSize: filters.pageSize,
    total: toCount(countRes.rows[0]?.total),
    rows: rowsRes.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      eventCount: toCount(row.event_count),
      generationCount: toCount(row.generation_count),
      successfulGenerationCount: toCount(row.success_count),
    })),
  };
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

export async function buildAdminReport(
  range: AdminDateRange,
  includeTrends = true,
): Promise<AdminReportPayload> {
  const pool = assertPool();
  const overviewPromise = buildAdminOverview(range);

  if (!includeTrends) {
    return {
      generatedAt: new Date().toISOString(),
      overview: await overviewPromise,
      generations: { daily: [], errors: [] },
      users: { dailySessions: [] },
    };
  }

  const generationFilter = buildDateRangeWhere(range, "created_at");
  const sessionFilter = buildDateRangeWhere(range, "created_at");

  const [overview, generationDailyRes, errorsRes, sessionsDailyRes] = await Promise.all([
    overviewPromise,
    pool.query<{ date: string; total: string; successful: string }>(
      `SELECT
         DATE(created_at)::text AS date,
         COUNT(*)::bigint AS total,
         COUNT(*) FILTER (WHERE success = true)::bigint AS successful
       FROM generation_logs
       ${generationFilter.where}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      generationFilter.params,
    ),
    pool.query<{ error_type: string | null; count: string }>(
      `SELECT error_type, COUNT(*)::bigint AS count
       FROM generation_logs
       ${generationFilter.where ? `${generationFilter.where} AND success = false` : "WHERE success = false"}
       GROUP BY error_type
       ORDER BY count DESC`,
      generationFilter.params,
    ),
    pool.query<{ date: string; sessions: string }>(
      `SELECT DATE(created_at)::text AS date, COUNT(*)::bigint AS sessions
       FROM sessions
       ${sessionFilter.where}
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      sessionFilter.params,
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    overview,
    generations: {
      daily: generationDailyRes.rows.map((row) => {
        const total = toCount(row.total);
        const successful = toCount(row.successful);
        return {
          date: row.date,
          total,
          successful,
          failed: Math.max(0, total - successful),
        };
      }),
      errors: errorsRes.rows.map((row) => ({
        errorType: row.error_type,
        count: toCount(row.count),
      })),
    },
    users: {
      dailySessions: sessionsDailyRes.rows.map((row) => ({
        date: row.date,
        sessions: toCount(row.sessions),
      })),
    },
  };
}
