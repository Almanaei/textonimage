/**
 * T-BE-105 — GET /api/stats route handler.
 *
 * Returns aggregated analytics KPIs.
 * Protected by a STATS_SECRET bearer token.
 *
 * Contract:
 *   GET /api/stats
 *   Authorization: Bearer <STATS_SECRET>
 *
 * Responses:
 *   200  application/json  — StatsReport
 *   401  application/json  — missing or invalid token
 *   405  application/json  — method not allowed
 *   500  application/json  — internal server error
 *
 * Security: STATS_SECRET must be at least 32 characters.
 * Enforced at startup to catch misconfiguration early.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildStatsReport } from "@/lib/aggregation";

export const dynamic = "force-dynamic";

const STATS_SECRET = process.env.STATS_SECRET ?? "";

/**
 * Constant-time token comparison using HMAC to eliminate length side-channels.
 * Both the expected secret and the provided token are hashed with the same key
 * before comparison, so timing reveals nothing about the secret's value or length.
 */
function isValidToken(provided: string): boolean {
  if (!STATS_SECRET || STATS_SECRET.length < 32 || !provided) return false;
  const key = Buffer.from(STATS_SECRET, "utf8");
  const expectedDigest = createHmac("sha256", key)
    .update(STATS_SECRET)
    .digest();
  const providedDigest = createHmac("sha256", key)
    .update(provided)
    .digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!isValidToken(token)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  // ── Build report ─────────────────────────────────────────────────────────────
  try {
    const report = await buildStatsReport();
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    if (err instanceof Error && err.message === "Database not configured") {
      return NextResponse.json(
        { success: false, message: "Analytics not available." },
        { status: 503 },
      );
    }
    console.error("[/api/stats] failed to build stats report", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, message: "Failed to retrieve stats" },
      { status: 500 },
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405 },
  );
}
