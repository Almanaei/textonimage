/**
 * T-BE-101 — POST /api/track route handler.
 *
 * Accepts client-side analytics events and writes them to the events table.
 * Called by the frontend for events like "download_clicked" and "page_view"
 * that cannot be instrumented server-side.
 *
 * Session ID is always read from the HttpOnly cookie set by middleware —
 * never from the request body — to prevent session spoofing.
 *
 * Contract:
 *   POST /api/track
 *   Content-Type: application/json
 *   Body: { eventType: string, metadata?: object }
 *
 * Responses:
 *   200  application/json  — { success: true }
 *   400  application/json  — validation error { success: false, message }
 *   405  application/json  — method not allowed
 *   500  application/json  — internal server error
 */

import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/lib/schema";
import { recordEvent, upsertSession } from "@/lib/events";
import { getSessionId } from "@/lib/session";
import { readBodyWithLimit, EMPTY_BODY } from "@/lib/read-body";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

const BODY_SIZE_LIMIT = 1024; // 1 KB

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limit ──────────────────────────────────────────────────────────────
  // Shared IP utility — prefers x-real-ip over x-forwarded-for first hop.
  // Fall back to session ID so direct connections are still limited per session.
  const sessionId = getSessionId(req);
  const ip = getClientIp(req) ?? sessionId ?? "no-session";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, message: "لقد تجاوزت الحد المسموح به. يرجى المحاولة لاحقاً." },
      { status: 429 },
    );
  }

  // ── Body size guard (stream-level — enforced even without Content-Length) ───
  const rawBody = await readBodyWithLimit(req, BODY_SIZE_LIMIT);
  if (rawBody === null) {
    return NextResponse.json({ success: false, message: "الطلب كبير جداً." }, { status: 413 });
  }
  if (rawBody === EMPTY_BODY) {
    return NextResponse.json({ success: false, message: "تنسيق الطلب غير صحيح." }, { status: 400 });
  }

  // ── Parse JSON ──────────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, message: "تنسيق الطلب غير صحيح." },
      { status: 400 },
    );
  }

  // ── Zod validation ──────────────────────────────────────────────────────────
  const parsed = TrackEventSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, message: firstIssue.message },
      { status: 400 },
    );
  }

  const { eventType, metadata = {} } = parsed.data;

  // Upsert session row so analytics have a valid FK even on the first request.
  if (sessionId) void upsertSession(sessionId);

  // ── Write event ─────────────────────────────────────────────────────────────
  // recordEvent is fire-and-forget and never throws to callers.
  await recordEvent(sessionId, eventType, metadata as Record<string, unknown>);

  return NextResponse.json({ success: true });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405 },
  );
}
