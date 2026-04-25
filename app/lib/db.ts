/**
 * lib/db.ts — PostgreSQL connection pool.
 *
 * Uses DATABASE_URL from environment. Exported `getPool()` is a singleton
 * so repeated imports share connections across the process lifetime.
 *
 * When DATABASE_URL is absent the server starts normally — analytics are
 * simply disabled. This allows local development without a database.
 */

import { Pool } from "pg";

// Singleton pool — re-used across hot-reloads in dev via globalThis trick.
declare global {
  var __pgPool: Pool | undefined;
}

function resolveSslConfig(databaseUrl: string | undefined): false | { rejectUnauthorized: true } {
  const sslModeFromUrl = (() => {
    if (!databaseUrl) return undefined;
    try {
      return new URL(databaseUrl).searchParams.get("sslmode")?.toLowerCase();
    } catch {
      return undefined;
    }
  })();
  const sslMode = (process.env.PGSSLMODE ?? sslModeFromUrl)?.toLowerCase();

  // Allow explicit non-SSL connections for local/CI Postgres.
  if (sslMode === "disable") return false;

  return process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: true }
    : false;
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: resolveSslConfig(databaseUrl),
  });
}

/**
 * Returns the shared pool, or null when DATABASE_URL is not configured.
 * Callers must null-check before querying — a null pool means analytics
 * are disabled but the application continues to serve requests.
 */
export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!globalThis.__pgPool) {
    globalThis.__pgPool = createPool();
  }
  return globalThis.__pgPool;
}

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL not set — analytics and event tracking are disabled.");
}
