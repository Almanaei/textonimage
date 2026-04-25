/**
 * lib/events.ts — Analytics event recording.
 *
 * Writes to the `events` and `generation_logs` tables.
 * All queries use parameterized values — no string interpolation.
 *
 * User-submitted name and email are stored in generation_logs so that
 * administrators can review submissions and export them via the admin dashboard.
 */

import { getPool } from "./db";

export type EventType =
  | "page_view"
  | "generation_requested"
  | "generation_success"
  | "generation_error"
  | "download_clicked"
  | "rate_limited";

export type ErrorType =
  | "validation"
  | "name_too_long"
  | "server"
  | "rate_limited"
  | "body_too_large"
  | "invalid_json";

/**
 * Records a generic event. Fire-and-forget — errors are logged but not thrown
 * so that analytics failures never break the user-facing request.
 */
export async function recordEvent(
  sessionId: string | null,
  eventType: EventType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!sessionId) return;
  const pool = getPool();
  if (!pool) return; // DB not configured — skip analytics silently
  try {
    await pool.query(
      `INSERT INTO events (session_id, event_type, metadata)
       VALUES ($1, $2, $3)`,
      [sessionId, eventType, JSON.stringify(metadata)],
    );
  } catch (err) {
    const msg = err instanceof Error
      ? (err.message || (err as NodeJS.ErrnoException).code || err.constructor.name)
      : String(err);
    console.error("[events] recordEvent failed", { eventType, error: msg });
  }
}

/**
 * Records a generation attempt outcome. Fire-and-forget.
 * name and email are stored so admins can review and export submissions.
 */
export async function recordGenerationLog(
  sessionId: string | null,
  success: boolean,
  durationMs: number,
  errorType?: ErrorType,
  name?: string,
  email?: string,
): Promise<void> {
  if (!sessionId) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO generation_logs (session_id, success, duration_ms, error_type, name, email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, success, durationMs, errorType ?? null, name ?? null, email ?? null],
    );
  } catch (err) {
    const msg = err instanceof Error
      ? (err.message || (err as NodeJS.ErrnoException).code || err.constructor.name)
      : String(err);
    console.error("[events] recordGenerationLog failed", { success, error: msg });
  }
}

/**
 * Upserts a session row. Called by middleware on each request.
 * Creates a new session or updates last_seen_at if it already exists.
 */
export async function upsertSession(sessionId: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO sessions (id) VALUES ($1)
       ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()`,
      [sessionId],
    );
  } catch (err) {
    const msg = err instanceof Error
      ? (err.message || (err as NodeJS.ErrnoException).code || err.constructor.name)
      : String(err);
    console.error("[events] upsertSession failed", { error: msg });
  }
}
