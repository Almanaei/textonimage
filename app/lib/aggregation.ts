/**
 * lib/aggregation.ts — KPI aggregation queries for the stats API.
 *
 * All queries run against the analytics tables: sessions, events, generation_logs.
 * Queries are read-only and use parameterized values where applicable.
 */

import { getPool } from "./db";

export interface GenerationStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number; // percentage, 0–100
  avgDurationMs: number;
}

export interface SessionStats {
  totalAllTime: number;
  totalToday: number;
}

export interface ErrorBreakdown {
  errorType: string | null;
  count: number;
}

export interface RateLimitStats {
  count: number;
}

export interface DailyTrend {
  date: string; // ISO date YYYY-MM-DD
  total: number;
  successful: number;
}

export interface StatsReport {
  generatedAt: string;
  generations: {
    allTime: GenerationStats;
    today: GenerationStats;
  };
  sessions: SessionStats;
  errorBreakdown: ErrorBreakdown[];
  rateLimited: RateLimitStats;
  trend: DailyTrend[]; // last 7 days
}

async function getGenerationStats(since?: Date): Promise<GenerationStats> {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const params: unknown[] = [];
  const whereClause = since
    ? `WHERE created_at >= $${params.push(since.toISOString())}`
    : "";

  const result = await pool.query<{
    total: string;
    successful: string;
    avg_duration_ms: string;
  }>(
    `SELECT
       COUNT(*)                                      AS total,
       COUNT(*) FILTER (WHERE success = true)        AS successful,
       COALESCE(AVG(duration_ms), 0)                 AS avg_duration_ms
     FROM generation_logs
     ${whereClause}`,
    params,
  );

  const row = result.rows[0];
  const total = Number(row.total);
  const successful = Number(row.successful);
  const failed = total - successful;

  return {
    total,
    successful,
    failed,
    successRate: total === 0 ? 0 : Math.round((successful / total) * 100),
    avgDurationMs: Math.round(Number(row.avg_duration_ms)),
  };
}

async function getSessionStats(): Promise<SessionStats> {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await pool.query<{ all_time: string; today: string }>(
    `SELECT
       COUNT(*)                                             AS all_time,
       COUNT(*) FILTER (WHERE created_at >= $1)            AS today
     FROM sessions`,
    [todayStart.toISOString()],
  );

  const row = result.rows[0];
  return {
    totalAllTime: Number(row.all_time),
    totalToday: Number(row.today),
  };
}

async function getErrorBreakdown(): Promise<ErrorBreakdown[]> {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const result = await pool.query<{ error_type: string | null; count: string }>(
    `SELECT error_type, COUNT(*) AS count
     FROM generation_logs
     WHERE success = false
     GROUP BY error_type
     ORDER BY count DESC`,
  );

  return result.rows.map((r) => ({
    errorType: r.error_type,
    count: Number(r.count),
  }));
}

async function getRateLimitedCount(): Promise<RateLimitStats> {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM events WHERE event_type = 'rate_limited'`,
  );
  return { count: Number(result.rows[0].count) };
}

async function getLast7DaysTrend(): Promise<DailyTrend[]> {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const result = await pool.query<{
    date: string;
    total: string;
    successful: string;
  }>(
    `SELECT
       DATE(created_at)                              AS date,
       COUNT(*)                                      AS total,
       COUNT(*) FILTER (WHERE success = true)        AS successful
     FROM generation_logs
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
  );

  return result.rows.map((r) => ({
    date: r.date,
    total: Number(r.total),
    successful: Number(r.successful),
  }));
}

/**
 * Computes the full stats report. Called by GET /api/stats.
 */
export async function buildStatsReport(): Promise<StatsReport> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [allTime, today, sessions, errorBreakdown, rateLimited, trend] =
    await Promise.all([
      getGenerationStats(),
      getGenerationStats(todayStart),
      getSessionStats(),
      getErrorBreakdown(),
      getRateLimitedCount(),
      getLast7DaysTrend(),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    generations: { allTime, today },
    sessions,
    errorBreakdown,
    rateLimited,
    trend,
  };
}
