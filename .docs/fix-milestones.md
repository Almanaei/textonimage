# Fix Milestones Plan — Code Review Issues
**Based on:** `docs/code-review-report.md`  
**Date:** April 23, 2026  
**Total Issues:** 12 (3 High · 3 Medium · 6 Low)

---

## Overview

| Milestone | Focus | Issues | Priority |
|---|---|---|---|
| [M1 — Security Hardening](#m1--security-hardening) | Fix all 🔴 High severity issues | #1, #2, #3 | Immediate |
| [M2 — Security & Memory Fixes](#m2--security--memory-fixes) | Fix all 🟡 Medium severity issues | #4, #5, #6 | High |
| [M3 — Code Quality](#m3--code-quality) | Fix 🟢 Low severity code/logic issues | #7, #8, #9, #10 | Medium |
| [M4 — Accessibility & UX](#m4--accessibility--ux) | Fix accessibility gap | #11 | Medium |
| [M5 — Test Coverage](#m5--test-coverage) | Add missing endpoint tests | #12 | Normal |

---

## M1 — Security Hardening

**Goal:** Eliminate all high-severity vulnerabilities before any further deployment.  
**Blocking:** Yes — no deployment should proceed until M1 is complete.

---

### Task M1-T1 — Fix Rate Limit Bypass via Spoofed `x-forwarded-for`

**Issue:** #1  
**File:** `app/app/api/generate/route.ts`  
**Agent:** Backend Agent  
**Skill:** `api-route-design-skill`

#### Background
The rate limiter uses `x-forwarded-for`'s *first* value as the rate-limit key. An attacker can set any value here, bypassing the limit by rotating spoofed IPs on every request.

#### Steps

1. **Open** `app/app/api/generate/route.ts`.
2. **Locate** the IP extraction block (line ~36):
   ```ts
   const ip =
     req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
     sessionId ||
     "no-session";
   ```
3. **Replace** with last-entry extraction (proxy-appended, not client-controlled):
   ```ts
   const forwarded = req.headers.get("x-forwarded-for");
   const ip =
     forwarded
       ? forwarded.split(",").at(-1)!.trim()
       : sessionId ?? "no-session";
   ```
4. **Update** the comment above the block to explain the trust model:
   ```ts
   // Use the last IP in x-forwarded-for — this is appended by the nearest
   // trusted proxy (Nginx/Cloudflare) and cannot be spoofed by the client.
   // Fall back to session ID so requests without a proxy still get limited.
   ```
5. **Add** an `.env.example` note clarifying that this assumes a single trusted proxy layer. If multi-proxy, `TRUSTED_PROXY_COUNT` should be configurable.

#### Acceptance Criteria
- [ ] Sending `X-Forwarded-For: 1.1.1.1, 2.2.2.2` causes `2.2.2.2` to be used as the key.
- [ ] A client sending `X-Forwarded-For: 99.99.99.99` (spoofed first entry) is still rate-limited correctly.
- [ ] Existing rate limit behavior is unchanged for normal requests.
- [ ] Code comment explains the proxy trust assumption.

---

### Task M1-T2 — Fix Silent Error Swallowing in Template Cache

**Issue:** #2  
**File:** `app/lib/composite.ts`  
**Agent:** Image Rendering Agent  
**Skill:** `image-compositing-skill` · `logging-monitoring-skill`

#### Background
`getTemplateBuffer()` catches no errors — if the template file is missing, the error bubbles up silently through the call stack with no log entry pointing to the root cause.

#### Steps

1. **Open** `app/lib/composite.ts`.
2. **Locate** `getTemplateBuffer()` (~line 17).
3. **Wrap** the `fs.readFile` call in a try/catch that logs before re-throwing:
   ```ts
   async function getTemplateBuffer(): Promise<Buffer> {
     if (!_templateBuffer) {
       try {
         _templateBuffer = await fs.readFile(TEMPLATE_PATH);
       } catch (err) {
         console.error("[composite] Failed to load template", {
           path: TEMPLATE_PATH,
           error: err instanceof Error ? err.message : String(err),
         });
         throw err;
       }
     }
     return _templateBuffer;
   }
   ```
4. **Verify** that the log entry includes the full `TEMPLATE_PATH` so an ops team can diagnose missing assets immediately.
5. **Ensure** no PII is included in the log (there is none here — safe).

#### Acceptance Criteria
- [ ] When `template.png` is temporarily renamed/removed, the server logs `[composite] Failed to load template` with the file path.
- [ ] The HTTP response is still a proper 500 with the standard error envelope.
- [ ] When the file exists, behavior is unchanged.

---

### Task M1-T3 — Remove or Safely Document `x-session-id` Forwarded Header

**Issue:** #3  
**File:** `app/middleware.ts`  
**Agent:** Backend Agent  
**Skill:** `api-route-design-skill`

#### Background
`middleware.ts` sets `x-session-id` on the response, making it look like a trusted internal header. However, an incoming request's own headers can include `x-session-id`, and without explicit stripping, a confused contributor may read it from `req.headers` instead of `req.cookies`, creating a session-spoofing vector.

#### Steps

1. **Open** `app/middleware.ts`.
2. **Remove** the line:
   ```ts
   response.headers.set("x-session-id", sessionId);
   ```
3. **Verify** that no existing route handler reads `req.headers.get("x-session-id")` — search the codebase:
   - `grep -r "x-session-id" app/` — should return zero results after removal.
4. **Confirm** all session reads go through `getSessionId(req)` (reads `req.cookies.get("sid")`).
5. If any debugging use case requires the header, **add a comment** instead:
   ```ts
   // NOTE: Session ID is available via req.cookies.get("sid") in route handlers.
   // Do NOT forward it as a request header — headers are attacker-controllable.
   ```

#### Acceptance Criteria
- [ ] `grep -r "x-session-id"` returns zero matches in `app/`.
- [ ] All route handlers that need the session ID use `getSessionId(req)`.
- [ ] No functional regression — analytics and rate limiting still work correctly.

---

## M2 — Security & Memory Fixes

**Goal:** Fix all medium-severity issues — memory leak, body-size bypass, and timing-attack gap.  
**Blocking:** Should be resolved before public launch.

---

### Task M2-T1 — Fix Blob URL Memory Leak

**Issue:** #4  
**File:** `app/components/CertificateShell.tsx`  
**Agent:** Frontend Agent  
**Skill:** `mobile-preview-ux-skill`

#### Background
Each certificate generation creates a `blob:` URL that keeps the PNG buffer (~500 KB) alive in browser memory. On mobile, repeated use or multiple generations without a page reload will exhaust memory.

#### Steps

1. **Open** `app/components/CertificateShell.tsx`.
2. **Add** a `useEffect` cleanup that revokes the Blob URL when `imageUrl` changes or the component unmounts:
   ```ts
   useEffect(() => {
     return () => {
       if (imageUrl) URL.revokeObjectURL(imageUrl);
     };
   }, [imageUrl]);
   ```
3. **Also** revoke the previous URL immediately before setting a new one in `handleSubmit`:
   ```ts
   // Before: setImageUrl(URL.createObjectURL(blob));
   // After:
   setImageUrl((prev) => {
     if (prev) URL.revokeObjectURL(prev);
     return URL.createObjectURL(blob);
   });
   ```
4. **Verify** the `useEffect` import is already present (it is — used by existing state).
5. **Test** on mobile that re-generating does not accumulate memory (DevTools Memory tab or Safari profiler).

#### Acceptance Criteria
- [ ] Generating a certificate twice does not accumulate two live Blob URLs in memory.
- [ ] When navigating away or unmounting, the current Blob URL is revoked.
- [ ] The image still displays and can be downloaded normally after the change.
- [ ] No React hook rule violations — effect dependencies are correct.

---

### Task M2-T2 — Enforce Hard Body Size Limit

**Issue:** #5  
**File:** `app/app/api/generate/route.ts`, `app/app/api/track/route.ts`  
**Agent:** Backend Agent  
**Skill:** `validation-and-sanitization-skill`

#### Background
The current body-size check reads `Content-Length` which is optional. A client that omits this header bypasses the 1 KB cap entirely, allowing large bodies to reach `req.json()`.

#### Steps

1. **Open** `app/app/api/generate/route.ts` and `app/app/api/track/route.ts`.
2. **Replace** the `Content-Length`-only guard with a dual check — honor the header *and* enforce a stream limit:

   **Option A (recommended) — Read body with size cap before parsing:**
   ```ts
   const MAX_BODY_BYTES = 1024;

   async function readBodyWithLimit(req: NextRequest, limit: number): Promise<string | null> {
     const reader = req.body?.getReader();
     if (!reader) return null;
     let bytes = 0;
     const chunks: Uint8Array[] = [];
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       bytes += value.byteLength;
       if (bytes > limit) {
         reader.cancel();
         return null; // signal oversized
       }
       chunks.push(value);
     }
     return new TextDecoder().decode(
       chunks.reduce((a, b) => { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }, new Uint8Array(0))
     );
   }
   ```

   **Option B (simpler) — Add a Content-Length fallback check after parse:**  
   Keep the existing header check AND add a post-parse JSON string length check:
   ```ts
   // After req.json() resolves:
   const rawStr = JSON.stringify(raw);
   if (rawStr.length > BODY_SIZE_LIMIT) {
     return NextResponse.json({ success: false, message: "الطلب كبير جداً." }, { status: 413 });
   }
   ```

3. **Apply the same fix** to `/api/track/route.ts` for consistency.
4. **Add a test case** in `scripts/test-edge-cases.ts` that sends a request without `Content-Length` but with a >1 KB body.

#### Acceptance Criteria
- [ ] A POST without `Content-Length` but with a 5 KB body receives a `413` response.
- [ ] A POST without `Content-Length` with a valid small body is still accepted.
- [ ] Both `/api/generate` and `/api/track` enforce the limit consistently.

---

### Task M2-T3 — Make Stats Token Comparison Fully Constant-Time

**Issue:** #6  
**File:** `app/app/api/stats/route.ts`  
**Agent:** Backend Agent  
**Skill:** `api-route-design-skill`

#### Background
The current comparison does constant-time buffer equality but then appends a non-constant-time length comparison, leaking the secret length through timing side-channel.

#### Steps

1. **Open** `app/app/api/stats/route.ts`.
2. **Replace** `isValidToken` with a HMAC-digest-based comparison that eliminates length side-channels:
   ```ts
   import { createHmac, timingSafeEqual } from "crypto";

   /**
    * Constant-time token comparison using HMAC to hide the length of STATS_SECRET.
    * Both tokens are hashed with the same key before comparison, so the timing
    * of the comparison is independent of input length.
    */
   function isValidToken(provided: string): boolean {
     if (!STATS_SECRET || !provided) return false;
     // Use a fixed key derived from STATS_SECRET itself to HMAC both values.
     // This means an attacker cannot distinguish "wrong length" from "wrong value".
     const key = Buffer.from(STATS_SECRET, "utf8");
     const expectedDigest = createHmac("sha256", key)
       .update(STATS_SECRET)
       .digest();
     const providedDigest = createHmac("sha256", key)
       .update(provided)
       .digest();
     return timingSafeEqual(expectedDigest, providedDigest);
   }
   ```
3. **Remove** the old `timingSafeEqual` import if it becomes unused (it is re-imported inside the new function via `crypto`).
4. **Update** the JSDoc comment to explain the HMAC approach.
5. **Verify** the startup check (`STATS_SECRET.length < 32`) is still in place — it is, and it should remain.

#### Acceptance Criteria
- [ ] A token of the correct value returns `200`.
- [ ] A token of incorrect value returns `401`.
- [ ] A token of incorrect *length* (shorter or longer) returns `401`.
- [ ] The comparison function has no non-constant-time branches that depend on `provided`.
- [ ] Crypto module usage passes a security linter (`eslint-plugin-security` or equivalent).

---

## M3 — Code Quality

**Goal:** Remove technical debt and subtle bugs in shared library code.

---

### Task M3-T1 — Eliminate Duplicate `GenerateInput` Type

**Issue:** #7  
**Files:** `app/lib/generate-image.ts`, `app/lib/schema.ts`  
**Agent:** Backend Agent  
**Skill:** `validation-and-sanitization-skill`

#### Steps

1. **Open** `app/lib/generate-image.ts`.
2. **Delete** the duplicate interface:
   ```ts
   // DELETE this block:
   export interface GenerateInput {
     name: string;
     email: string;
   }
   ```
3. **Add** an import from `schema.ts`:
   ```ts
   import type { GenerateInput } from "./schema";
   ```
4. **Re-export** it from `generate-image.ts` if any external consumer imports it from there:
   ```ts
   export type { GenerateInput } from "./schema";
   ```
5. **Check** all imports of `GenerateInput` across the codebase (`grep -r "GenerateInput"`) and update any that point to `generate-image.ts` to point to `schema.ts`.
6. **Run** TypeScript compiler (`npx tsc --noEmit`) to confirm no type errors.

#### Acceptance Criteria
- [ ] `GenerateInput` is defined exactly once — in `schema.ts`.
- [ ] All consumers import from `schema.ts` (or re-exported from `generate-image.ts`).
- [ ] `npx tsc --noEmit` passes with zero errors.

---

### Task M3-T2 — Make `DATABASE_URL` Absence Non-Fatal

**Issue:** #8  
**File:** `app/lib/db.ts`, `app/lib/events.ts`  
**Agent:** Backend Agent / Observability Agent  
**Skill:** `logging-monitoring-skill`

#### Background
The server crashes at startup if `DATABASE_URL` is unset. Since analytics are optional and fire-and-forget, this is too strict and blocks local development without a database.

#### Steps

1. **Open** `app/lib/db.ts`.
2. **Remove** the startup throw:
   ```ts
   // DELETE:
   if (!process.env.DATABASE_URL) {
     throw new Error("DATABASE_URL environment variable is required");
   }
   ```
3. **Replace** the module-level pool export with a lazy getter that returns `null` when unconfigured:
   ```ts
   declare global {
     var __pgPool: Pool | undefined;
   }

   export function getPool(): Pool | null {
     if (!process.env.DATABASE_URL) {
       return null;
     }
     if (!globalThis.__pgPool) {
       globalThis.__pgPool = createPool();
     }
     return globalThis.__pgPool;
   }
   ```
4. **Open** `app/lib/events.ts`.
5. **Replace** all `pool.query(...)` calls with `getPool()?.query(...)` pattern:
   ```ts
   import { getPool } from "./db";

   export async function recordEvent(...): Promise<void> {
     if (!sessionId) return;
     const pool = getPool();
     if (!pool) return; // DB not configured — skip analytics silently
     try {
       await pool.query(...);
     } catch (err) { ... }
   }
   ```
6. **Repeat** for `recordGenerationLog` and `upsertSession`.
7. **Add a single startup warning** (not throw) in `db.ts`:
   ```ts
   if (!process.env.DATABASE_URL) {
     console.warn("[db] DATABASE_URL not set — analytics and event tracking are disabled.");
   }
   ```
8. **Update** `app/lib/aggregation.ts` similarly — `buildStatsReport` should throw a meaningful error if called without DB (since `/api/stats` is useless without it), but this should be a runtime error in the handler, not a startup crash.

#### Acceptance Criteria
- [ ] Starting the server without `DATABASE_URL` emits a warning but does not crash.
- [ ] Certificate generation, form submission, and image download all work without a database.
- [ ] With a valid `DATABASE_URL`, analytics are recorded normally.
- [ ] `/api/stats` returns `503` (not a startup crash) when called without DB configured.

---

### Task M3-T3 — Fix `estimateTextWidth` for Arabic Diacritics (Tashkeel)

**Issue:** #9  
**File:** `app/lib/layout.ts`  
**Agent:** Image Rendering Agent  
**Skill:** `arabic-text-layout-skill`

#### Background
The width estimator counts tashkeel diacritics as full-width characters when they have near-zero advance width. This makes the font-shrink loop choose unnecessarily small fonts for voweled names.

#### Steps

1. **Open** `app/lib/layout.ts`.
2. **Add** a diacritic-stripping constant at the top of the constants section:
   ```ts
   /**
    * Arabic combining diacritics (tashkeel, shadda, etc.) — zero advance width.
    * Ranges: U+0610–U+061A (extended Arabic), U+064B–U+065F (tashkeel),
    *         U+0670 (superscript alef), U+06D6–U+06DC (Quranic annotation marks).
    */
   const ZERO_WIDTH_ARABIC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC]/g;
   ```
3. **Update** `estimateTextWidth` to exclude diacritics before measuring:
   ```ts
   export function estimateTextWidth(text: string, fontSize: number): number {
     const measurable = text.replace(ZERO_WIDTH_ARABIC, "");
     return measurable.length * fontSize * CHAR_WIDTH_RATIO;
   }
   ```
4. **Add** a test case with a tashkeel name to `scripts/test-render.ts`:
   ```ts
   {
     label: "tashkeel-name",
     name: "مُحَمَّدٌ العَلِيّ",
     email: "test@example.com",
   }
   ```
5. **Visually verify** the rendered output — the font size should be larger than the non-diacritic-aware version.

#### Acceptance Criteria
- [ ] `estimateTextWidth("مُحَمَّد", 60)` returns approximately the same as `estimateTextWidth("محمد", 60)`.
- [ ] A voweled name renders at a visually appropriate font size (not shrunk unnecessarily).
- [ ] All existing test cases (`reference-name`, `short-name`, `long-name`) still pass.
- [ ] `npx tsc --noEmit` passes.

---

### Task M3-T4 — Fix `split(" ")` to Handle All Unicode Space Variants

**Issue:** #10  
**File:** `app/lib/layout.ts`  
**Agent:** Image Rendering Agent  
**Skill:** `arabic-text-layout-skill`

#### Steps

1. **Open** `app/lib/layout.ts`.
2. **Locate** `splitIntoLines` (~line 85):
   ```ts
   const words = name.split(" ");
   ```
3. **Replace** with a Unicode-aware regex split:
   ```ts
   const words = name.split(/\s+/);
   ```
4. **Verify** that `normalizeName` (which already uses `/\s+/` for collapsing) is consistent with this change — it is.
5. **Add** a unit test assertion (or log in `test-render.ts`) for a name with a non-breaking space (`\u00A0`) to confirm it splits correctly.

#### Acceptance Criteria
- [ ] A name with `U+00A0` (non-breaking space) between words is split into separate lines correctly.
- [ ] A name with double spaces still behaves identically (no empty word tokens).
- [ ] All existing layout test cases are unaffected.

---

## M4 — Accessibility & UX

**Goal:** Ensure dynamic error messages are accessible to screen reader users.

---

### Task M4-T1 — Add `aria-live` to Dynamic Error Messages

**Issue:** #11  
**File:** `app/components/CertificateShell.tsx`  
**Agent:** Frontend Agent  
**Skill:** `mobile-preview-ux-skill`

#### Steps

1. **Open** `app/components/CertificateShell.tsx`.
2. **Locate** the `nameError` paragraph (~line 132) and add `aria-live="polite"` and `role="alert"`:
   ```tsx
   {nameError && (
     <p
       className="text-[11px] text-red-300 drop-shadow font-arabic"
       aria-live="polite"
       role="alert"
     >
       {nameError}
     </p>
   )}
   ```
3. **Repeat** for the `emailError` paragraph (~line 148):
   ```tsx
   {emailError && (
     <p
       className="text-[11px] text-red-300 drop-shadow font-arabic"
       aria-live="polite"
       role="alert"
     >
       {emailError}
     </p>
   )}
   ```
4. **Repeat** for `serverError` (~line 155) — use `aria-live="assertive"` since this is a critical failure:
   ```tsx
   {serverError && (
     <p
       className="text-[11px] text-red-300 text-center drop-shadow font-arabic"
       aria-live="assertive"
       role="alert"
     >
       {serverError}
     </p>
   )}
   ```
5. **Verify** using a screen reader (NVDA/VoiceOver) or the axe browser extension that errors are announced when they appear.
6. **Also** ensure the form inputs have associated `<label>` elements (they do via visible `<label>` tags) and check that `htmlFor` / `id` pairs are wired correctly. Currently labels are visual only — add `htmlFor` and `id` to associate them programmatically:
   ```tsx
   <label htmlFor="name-input" className="...">الاسم بالعربي</label>
   <input id="name-input" ref={nameRef} ... />

   <label htmlFor="email-input" className="...">البريد الإلكتروني</label>
   <input id="email-input" ref={emailRef} ... />
   ```

#### Acceptance Criteria
- [ ] All three error messages have `aria-live` and `role="alert"`.
- [ ] Screen reader (VoiceOver/NVDA) announces the error when it appears.
- [ ] Form inputs are programmatically associated with their `<label>` elements via `htmlFor`/`id`.
- [ ] No existing visual behavior changes.
- [ ] axe-core audit returns zero WCAG 2.1 AA violations on the form screen.

---

## M5 — Test Coverage

**Goal:** Add missing endpoint test coverage for `/api/track` and `/api/stats`.

---

### Task M5-T1 — Add Test Script for `/api/track`

**Issue:** #12  
**File:** `app/scripts/test-track.ts` *(new file)*  
**Agent:** QA Agent  
**Skill:** `testing-strategy-skill`

#### Steps

1. **Create** `app/scripts/test-track.ts` following the same structure as `test-edge-cases.ts`.
2. **Include** the following test cases:

   | Case | Input | Expected Status |
   |---|---|---|
   | Valid `page_view` event | `{ eventType: "page_view" }` | `200` |
   | Valid `download_clicked` event | `{ eventType: "download_clicked" }` | `200` |
   | Unknown event type | `{ eventType: "unknown_event" }` | `400` |
   | Missing `eventType` field | `{}` | `400` |
   | Oversized body (no `Content-Length`) | 5 KB payload | `413` |
   | Empty body | (empty string) | `400` |
   | Non-JSON body | `"not json"` | `400` |

3. **Assert** response shape for error cases: `{ success: false, message: string }`.
4. **Run** the script against a local dev server to confirm all cases pass.

#### Acceptance Criteria
- [ ] Script runs via `npx tsx scripts/test-track.ts` with all cases passing.
- [ ] All 7 test cases produce the expected HTTP status codes.
- [ ] No unhandled promise rejections.

---

### Task M5-T2 — Add Test Script for `/api/stats`

**Issue:** #12  
**File:** `app/scripts/test-stats.ts` *(new file)*  
**Agent:** QA Agent  
**Skill:** `testing-strategy-skill`

#### Steps

1. **Create** `app/scripts/test-stats.ts`.
2. **Include** the following test cases:

   | Case | Input | Expected Status |
   |---|---|---|
   | Correct bearer token | `Authorization: Bearer <STATS_SECRET>` | `200` |
   | Wrong token value | `Authorization: Bearer wrongtoken` | `401` |
   | Token shorter than expected | `Authorization: Bearer short` | `401` |
   | Token longer than expected | `Authorization: Bearer <secret>XXXXX` | `401` |
   | Missing `Authorization` header | (none) | `401` |
   | `Authorization` without `Bearer` prefix | `Authorization: <secret>` | `401` |
   | GET method (valid) | GET with correct token | `200` |
   | POST method | POST request | `405` |

3. **Load** `STATS_SECRET` from `.env.local` for the valid-token case (use `dotenv` or `process.env`).
4. **Verify** that the 200 response includes expected fields: `generatedAt`, `generations`, `sessions`, `trend`.

#### Acceptance Criteria
- [ ] Script runs via `npx tsx scripts/test-stats.ts` with all 8 cases passing.
- [ ] Timing attack surface is verified: wrong-token and short-token both return `401` with no status difference.
- [ ] The `200` response shape matches the `StatsReport` type.

---

## Execution Order & Dependencies

```
M1-T1 ──────────────────────────────────────────► (independent)
M1-T2 ──────────────────────────────────────────► (independent)
M1-T3 ──────────────────────────────────────────► (independent)
                                                    │
M2-T1 ──────────────────────────────────────────► (independent)
M2-T2 ──────────────────────────────────────────► (independent)
M2-T3 ──────────────────────────────────────────► (independent)
                                                    │
M3-T1 ──────────────────────────────────────────► (independent)
M3-T2 ──────── (must complete before M5-T1/T2) ──►
M3-T3 ──────── (depends on layout.ts stable) ────►
M3-T4 ──────── (same file as M3-T3 — do together)►
                                                    │
M4-T1 ──────────────────────────────────────────► (independent)
                                                    │
M5-T1 ──────── (after M2-T2 body-limit fix) ─────►
M5-T2 ──────── (after M2-T3 token fix) ──────────►
```

**Recommended execution sequence:**
1. Complete all of **M1** first (security-critical, unblock deployment).
2. Complete **M2-T3** (token fix) before running M5-T2 (tests would fail against unfixed code).
3. Complete **M2-T2** (body limit) before running M5-T1.
4. **M3-T3** and **M3-T4** touch the same file (`layout.ts`) — do them in the same PR.
5. **M4** and **M5** can run in parallel once M1 and M2 are merged.

---

## Definition of Done (per task)

A task is complete when **all** of the following are true:

- [ ] Code changes are implemented as specified above.
- [ ] TypeScript compiles with `npx tsc --noEmit` (zero errors).
- [ ] ESLint passes with `npx eslint app/` (zero new warnings).
- [ ] All existing test scripts (`test-render.ts`, `test-edge-cases.ts`) still pass.
- [ ] Task-specific acceptance criteria are fully checked off.
- [ ] No PII introduced in logs.
- [ ] No new security vulnerabilities introduced (checked against OWASP Top 10).

---

## Milestone Completion Checklist

| Task | Status | Owner |
|---|---|---|
| M1-T1 — Rate limit IP fix | ⬜ Not started | Backend Agent |
| M1-T2 — Template cache error logging | ⬜ Not started | Image Rendering Agent |
| M1-T3 — Remove `x-session-id` header | ⬜ Not started | Backend Agent |
| M2-T1 — Revoke Blob URL | ⬜ Not started | Frontend Agent |
| M2-T2 — Hard body size enforcement | ⬜ Not started | Backend Agent |
| M2-T3 — HMAC token comparison | ⬜ Not started | Backend Agent |
| M3-T1 — Remove duplicate `GenerateInput` | ⬜ Not started | Backend Agent |
| M3-T2 — Non-fatal `DATABASE_URL` | ⬜ Not started | Backend Agent / Observability Agent |
| M3-T3 — Tashkeel-aware width estimate | ⬜ Not started | Image Rendering Agent |
| M3-T4 — Unicode-aware `split` | ⬜ Not started | Image Rendering Agent |
| M4-T1 — `aria-live` on error messages | ⬜ Not started | Frontend Agent |
| M5-T1 — Test script for `/api/track` | ⬜ Not started | QA Agent |
| M5-T2 — Test script for `/api/stats` | ⬜ Not started | QA Agent |
