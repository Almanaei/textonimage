/**
 * T-021 — POST /api/generate route handler.
 *
 * Contract:
 *   POST /api/generate
 *   Content-Type: application/json
 *   Body: { name: string, email: string }
 *   Body size cap: 1 KB
 *
 * Responses:
 *   200  image/png         — generated certificate
 *   400  application/json  — validation error  { success: false, message, field? }
 *   405  application/json  — method not allowed
 *   422  application/json  — business rule (name too long)
 *   429  application/json  — rate limited
 *   500  application/json  — internal server error
 */

import { NextRequest, NextResponse } from "next/server";
import { GenerateSchema } from "@/lib/schema";
import { generateCertificate } from "@/lib/generate-image";
import { checkRateLimit } from "@/lib/rate-limit";
import { NameTooLongError, ValidationError } from "@/lib/errors";
import { getSessionId } from "@/lib/session";
import { recordEvent, recordGenerationLog, upsertSession } from "@/lib/events";
import { readBodyWithLimit, EMPTY_BODY } from "@/lib/read-body";
import { getClientIp } from "@/lib/ip";
import { getGeoLocation } from "@/lib/geo";

const BODY_SIZE_LIMIT = 1024; // 1 KB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionId = getSessionId(req);

  // Upsert session row so analytics have a valid FK even on the first request.
  // Fire-and-forget — a DB failure must never block image generation.
  if (sessionId) void upsertSession(sessionId);

  // ── Rate limit ──────────────────────────────────────────────────────────────
  // Prefer x-real-ip (set by Vercel/Nginx to the actual client IP), then the
  // first hop of x-forwarded-for.  Fall back to session ID so requests without
  // any proxy header are still rate-limited per session rather than globally.
  const ip = getClientIp(req) ?? sessionId ?? "no-session";
  if (!checkRateLimit(ip)) {
    console.warn("[/api/generate] rate_limited", { event: "rate_limited" });
    void recordEvent(sessionId, "rate_limited");
    return NextResponse.json(
      { success: false, message: "لقد تجاوزت الحد المسموح به. يرجى المحاولة لاحقاً." },
      { status: 429 },
    );
  }

  // ── Body size guard (stream-level — enforced even without Content-Length) ───
  const rawBody = await readBodyWithLimit(req, BODY_SIZE_LIMIT);
  if (rawBody === null) {
    // null means the body was present but exceeded the size limit.
    console.warn("[/api/generate] body_too_large", { event: "body_too_large" });
    return NextResponse.json({ success: false, message: "الطلب كبير جداً." }, { status: 413 });
  }
  if (rawBody === EMPTY_BODY) {
    // Empty body — treat as a validation error, not an oversize error.
    console.warn("[/api/generate] empty_body", { event: "validation_failure", reason: "empty_body" });
    return NextResponse.json({ success: false, message: "تنسيق الطلب غير صحيح." }, { status: 400 });
  }

  // ── Parse JSON ──────────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    console.warn("[/api/generate] invalid_json", { event: "validation_failure", reason: "invalid_json" });
    return NextResponse.json(
      { success: false, message: "تنسيق الطلب غير صحيح." },
      { status: 400 },
    );
  }

  // ── Zod validation ──────────────────────────────────────────────────────────
  const parsed = GenerateSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    console.warn("[/api/generate] validation_failure", {
      event: "validation_failure",
      field: firstIssue.path[0] ?? null,
      code: firstIssue.code,
    });
    return NextResponse.json(
      {
        success: false,
        message: firstIssue.message,
        field: firstIssue.path[0] ?? null,
      },
      { status: 400 },
    );
  }

  // ── Geo-location (Cloudflare headers — best-effort, no-op without CF) ───────
  const geo = getGeoLocation(req);

  // ── Generate certificate ────────────────────────────────────────────────────
  void recordEvent(sessionId, "generation_requested");
  const t0 = Date.now();
  try {
    const pngBuffer = await generateCertificate(parsed.data);
    const latencyMs = Date.now() - t0;

    console.info("[/api/generate] success", { event: "generation_success", latencyMs });
    void recordEvent(sessionId, "generation_success");
    void recordGenerationLog(sessionId, true, latencyMs, undefined, parsed.data.name, parsed.data.email, geo.countryCode, geo.city);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="generated-image.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      const latencyMs = Date.now() - t0;
      console.warn("[/api/generate] business_validation_failure", {
        event: "validation_failure",
        field: err.field ?? null,
      });
      void recordEvent(sessionId, "generation_error", { errorType: "validation" });
      void recordGenerationLog(sessionId, false, latencyMs, "validation", parsed.data.name, parsed.data.email, geo.countryCode, geo.city);
      return NextResponse.json(
        { success: false, message: err.message, field: err.field },
        { status: 400 },
      );
    }

    if (err instanceof NameTooLongError) {
      const latencyMs = Date.now() - t0;
      console.warn("[/api/generate] name_too_long", {
        event: "generation_failure",
        reason: "name_too_long",
        latencyMs,
      });
      void recordEvent(sessionId, "generation_error", { errorType: "name_too_long" });
      void recordGenerationLog(sessionId, false, latencyMs, "name_too_long", parsed.data.name, parsed.data.email, geo.countryCode, geo.city);
      return NextResponse.json(
        { success: false, message: "الاسم طويل جداً ولا يمكن وضعه على الشهادة." },
        { status: 422 },
      );
    }

    // Log non-PII context only
    const latencyMs = Date.now() - t0;
    console.error("[/api/generate] generation_error", {
      event: "generation_failure",
      errorType: err instanceof Error ? err.constructor.name : typeof err,
      message: err instanceof Error ? err.message : "unknown",
      latencyMs,
    });
    void recordEvent(sessionId, "generation_error", { errorType: "server" });
    void recordGenerationLog(sessionId, false, latencyMs, "server", parsed.data.name, parsed.data.email, geo.countryCode, geo.city);

    return NextResponse.json(
      { success: false, message: "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى." },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}
