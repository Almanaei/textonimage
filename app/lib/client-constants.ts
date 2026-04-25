/**
 * lib/client-constants.ts — Shared client-side validation constants.
 *
 * These mirror the server-side rules in lib/schema.ts.
 * Kept here as a single source of truth so client components stay in sync
 * without duplicating the values.
 */

/** Accepts Arabic letters (U+0600–U+077F) and spaces only. */
export const ARABIC_NAME_PATTERN = /^[\u0600-\u06FF\u0750-\u077F\s]+$/;

/** Basic email format check — fine-grained validation is done server-side by Zod. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Must match the `max(60)` constraint in GenerateSchema. */
export const NAME_MAX_LENGTH = 60;
