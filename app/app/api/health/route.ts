import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * GET /api/health
 *
 * Lightweight liveness + readiness probe used by Docker / load-balancers.
 * Returns 200 {"status":"ok"} when the app process is healthy.
 * DB connectivity is tested as a readiness signal and included in the response
 * body, but a DB failure only changes the body — the HTTP status stays 200 so
 * that the app is not restarted just because analytics are temporarily down.
 */
export async function GET(): Promise<NextResponse> {
  const pool = getPool();

  let db: "ok" | "disabled" | "error" = "disabled";
  if (pool) {
    try {
      await pool.query("SELECT 1");
      db = "ok";
    } catch {
      db = "error";
    }
  }

  return NextResponse.json(
    { status: "ok", db },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
