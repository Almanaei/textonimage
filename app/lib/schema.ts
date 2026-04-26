/**
 * T-019 — Zod validation schema for POST /api/generate.
 *
 * Runs on the server before any image work begins.
 * Mirrors the validation in generate-image.ts but expressed as a
 * Zod schema so the route handler gets structured field errors.
 */

import { z } from "zod";

const ARABIC_NAME_PATTERN = /^[\u0600-\u06FF\u0750-\u077F\s]+$/;

export const GenerateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "الاسم يجب أن يكون حرفين على الأقل" })
    .max(60, { error: "الاسم طويل جداً (الحد الأقصى 60 حرفاً)" })
    .regex(ARABIC_NAME_PATTERN, { error: "يرجى إدخال الاسم بالعربية فقط" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ error: "صيغة البريد الإلكتروني غير صحيحة" }),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;

// ── T-BE-101 — Event tracking schema ─────────────────────────────────────────

const EVENT_TYPES = [
  "page_view",
  "generation_requested",
  "generation_success",
  "generation_error",
  "download_clicked",
  "rate_limited",
  "share_clicked",
  "share_copy_clicked",
  "whatsapp_share_clicked",
] as const;

export const TrackEventSchema = z.object({
  /** Must be one of the known event types. */
  eventType: z.enum(EVENT_TYPES, {
    error: "نوع الحدث غير معروف",
  }),
  /** Optional free-form metadata. Must not contain PII. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackEventInput = z.infer<typeof TrackEventSchema>;
