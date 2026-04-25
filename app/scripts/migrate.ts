/**
 * scripts/migrate.ts — Database migration runner.
 *
 * Creates the analytics tables and indexes if they do not already exist.
 * Safe to run multiple times (idempotent: CREATE TABLE IF NOT EXISTS).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate.ts
 */

import { Pool } from "pg";

function resolveSslConfig(databaseUrl: string): false | { rejectUnauthorized: true } {
  const sslModeFromUrl = (() => {
    try {
      return new URL(databaseUrl).searchParams.get("sslmode")?.toLowerCase();
    } catch {
      return undefined;
    }
  })();
  const sslMode = (process.env.PGSSLMODE ?? sslModeFromUrl)?.toLowerCase();

  if (sslMode === "disable") return false;

  return process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: true }
    : false;
}

async function migrate(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: resolveSslConfig(url),
  });

  const client = await pool.connect();
  console.log("Connected to database. Running migrations...\n");

  try {
    await client.query("BEGIN");

    // ── extensions ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto
    `);
    console.log("✓ pgcrypto extension");

    // ── sessions ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at    TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
        last_seen_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW()
      )
    `);
    console.log("✓ sessions table");

    // ── events ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        event_type  TEXT        NOT NULL,
        metadata    JSONB       NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✓ events table");

    // ── generation_logs ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS generation_logs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        success     BOOLEAN     NOT NULL,
        duration_ms INTEGER     NOT NULL,
        error_type  TEXT,
        name        TEXT,
        email       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Add columns to existing tables (safe on fresh installs — no-op if column already exists).
    await client.query(`ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS name  TEXT`);
    await client.query(`ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS email TEXT`);
    console.log("✓ generation_logs table");

    // ── indexes ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_session_id
        ON events (session_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_created_at
        ON events (created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_event_type
        ON events (event_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at
        ON sessions (created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_logs_session_id
        ON generation_logs (session_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at
        ON generation_logs (created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_logs_success
        ON generation_logs (success)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_logs_success_created_at
        ON generation_logs (success, created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_logs_error_type_failed
        ON generation_logs (error_type)
        WHERE success = false
    `);
    console.log("✓ indexes");

    await client.query("COMMIT");
    console.log("\nAll migrations applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed — rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
