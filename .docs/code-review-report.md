# Code Review Report — Arabic Name Image Generator

**Date:** April 23, 2026  
**Reviewer:** GitHub Copilot (Code Review Analysis Skill)  
**Scope:** Full codebase review — security, quality, performance, accessibility

---

## Summary Table

| # | Severity | File | Issue |
|---|---|---|---|
| 1 | 🔴 High | `app/api/generate/route.ts` | Rate limit bypass via spoofed `x-forwarded-for` |
| 2 | 🔴 High | `lib/composite.ts` | Template cache swallows file-load errors silently |
| 3 | 🔴 High | `middleware.ts` | `x-session-id` forwarded header is a security footgun |
| 4 | 🟡 Medium | `components/CertificateShell.tsx` | Blob URL never revoked — memory leak |
| 5 | 🟡 Medium | `app/api/generate/route.ts` | `content-length` check bypassable — actual body unguarded |
| 6 | 🟡 Medium | `app/api/stats/route.ts` | Token length check is not constant-time |
| 7 | 🟢 Low | `lib/generate-image.ts` | Duplicate `GenerateInput` type definition |
| 8 | 🟢 Low | `lib/db.ts` | Hard crash on missing `DATABASE_URL` at module load |
| 9 | 🟢 Low | `lib/layout.ts` | `CHAR_WIDTH_RATIO` inaccurate for Arabic diacritics (tashkeel) |
| 10 | 🟢 Low | `lib/layout.ts` | `split(" ")` may miss non-standard Arabic space variants |
| 11 | 🟢 Low | `components/CertificateShell.tsx` | Missing `aria-live` on dynamic error messages |
| 12 | 🟢 Low | `scripts/` | No test coverage for `/api/track` and `/api/stats` endpoints |

---

## 🔴 High Severity

### Issue 1 — Rate Limit Bypass via Spoofed `x-forwarded-for`

**File:** `app/api/generate/route.ts` (line ~36)

**Description:**  
The rate limiter key is derived from the first value in the `x-forwarded-for` header, which an attacker fully controls. By sending a different fake IP on every request, they can completely bypass the 10 req/min limit.

```ts
// Current — attacker controls this header
const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  sessionId ||
  "no-session";
```

**Fix:**  
Trust only the *last* IP in the `x-forwarded-for` chain (the one added by the trusted proxy closest to the server), or use the real socket IP. If behind a single trusted proxy (e.g. Nginx/Cloudflare), read only their appended value:

```ts
const forwarded = req.headers.get("x-forwarded-for");
const ip =
  forwarded
    ? forwarded.split(",").at(-1)!.trim()   // last = proxy-appended, not client-controlled
    : sessionId ?? "no-session";
```

---

### Issue 2 — Template Cache Swallows File-Load Errors Silently

**File:** `lib/composite.ts` (line ~17)

**Description:**  
The template buffer is cached in a module-level variable. If `fs.readFile` throws (e.g. missing template file), the variable stays `null` and no error is logged at the cache layer — the error propagates only as a generic 500 to the client with no actionable log entry.

```ts
let _templateBuffer: Buffer | null = null;

async function getTemplateBuffer(): Promise<Buffer> {
  if (!_templateBuffer) {
    _templateBuffer = await fs.readFile(TEMPLATE_PATH); // throws silently to caller
  }
  return _templateBuffer;
}
```

**Fix:**  
Log the error before re-throwing so the template path is visible in logs:

```ts
async function getTemplateBuffer(): Promise<Buffer> {
  if (!_templateBuffer) {
    try {
      _templateBuffer = await fs.readFile(TEMPLATE_PATH);
    } catch (err) {
      console.error("[composite] Failed to load template", { path: TEMPLATE_PATH, error: err });
      throw err;
    }
  }
  return _templateBuffer;
}
```

---

### Issue 3 — `x-session-id` Forwarded Header is a Security Footgun

**File:** `middleware.ts` (line ~38)

**Description:**  
Middleware forwards the session ID via a custom response header:

```ts
response.headers.set("x-session-id", sessionId);
```

This header is readable from `req.headers` in route handlers. Any future contributor who reads `req.headers.get("x-session-id")` instead of `req.cookies.get("sid")` would be reading an attacker-controllable value (since incoming request headers are not filtered). The existing `getSessionId()` correctly reads from cookies, but the forwarded header creates a dangerous footgun.

**Fix:**  
Remove the `x-session-id` forwarded header entirely — all route handlers already use `req.cookies` via `getSessionId()`. If the header is needed for debugging, add a clear comment that it must never be used for authentication or authorization decisions.

---

## 🟡 Medium Severity

### Issue 4 — Blob URL Never Revoked (Memory Leak)

**File:** `components/CertificateShell.tsx` (line ~52)

**Description:**  
Every successful certificate generation creates a Blob URL that holds the full PNG buffer (~500 KB+) in memory. This URL is never revoked, causing a memory leak on repeated use — particularly impactful on constrained mobile devices.

```ts
const blob = new Blob([arrayBuffer], { type: "image/png" });
setImageUrl(URL.createObjectURL(blob)); // never cleaned up
```

**Fix:**  
Revoke the previous URL before creating a new one, and clean up on unmount:

```ts
// On new generation
if (imageUrl) URL.revokeObjectURL(imageUrl);
const newUrl = URL.createObjectURL(blob);
setImageUrl(newUrl);

// In a useEffect cleanup
useEffect(() => {
  return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
}, [imageUrl]);
```

---

### Issue 5 — `Content-Length` Check is Bypassable

**File:** `app/api/generate/route.ts` (line ~50)

**Description:**  
The body size guard only inspects the `Content-Length` header, which is optional and can be omitted entirely. A request without this header evaluates to `0` and bypasses the 1 KB cap, allowing arbitrarily large bodies to reach `req.json()`.

```ts
const contentLength = Number(req.headers.get("content-length") ?? 0);
if (contentLength > BODY_SIZE_LIMIT) { ... }
// ↑ passes if Content-Length is absent
```

**Fix:**  
Configure a body parser size limit in `next.config.ts` or enforce it by reading the stream with a byte cap before calling `req.json()`. Alternatively, wrap the JSON parse in a size-limited reader:

```ts
// next.config.ts — add to api config
api: { bodyParser: { sizeLimit: "1kb" } }
```

---

### Issue 6 — Token Length Check is Not Constant-Time

**File:** `app/api/stats/route.ts` (line ~38)

**Description:**  
The bearer token comparison uses `timingSafeEqual` for the buffer comparison but then appends a non-constant-time length check:

```ts
return timingSafeEqual(secretBuf, tokenBuf) && provided.length === STATS_SECRET.length;
```

An attacker can determine the expected token length by probing until this check stops short-circuiting — reducing brute-force cost significantly.

**Fix:**  
Encode the length into the buffer comparison itself. Allocate both buffers to the *same fixed size* so `timingSafeEqual` always runs, and derive length inequality from the result:

```ts
function isValidToken(provided: string): boolean {
  if (!STATS_SECRET || !provided) return false;
  const secretBuf = Buffer.from(STATS_SECRET, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (secretBuf.length !== providedBuf.length) return false; // still leaks length
  return timingSafeEqual(secretBuf, providedBuf);
}
// Better: use a fixed-length HMAC comparison
```

The safest approach is to HMAC both values with the same key before comparing, so length differences are hidden inside the digest.

---

## 🟢 Low Severity / Code Quality

### Issue 7 — Duplicate `GenerateInput` Type

**File:** `lib/generate-image.ts` (line ~23), `lib/schema.ts` (line ~25)

**Description:**  
`GenerateInput` is defined twice — as a `z.infer` export in `schema.ts` and as a standalone interface in `generate-image.ts`. They are structurally identical today but will drift independently over time.

**Fix:**  
Remove the duplicate in `generate-image.ts` and import from `schema.ts`:

```ts
// generate-image.ts
import type { GenerateInput } from "./schema";
```

---

### Issue 8 — Hard Crash on Missing `DATABASE_URL`

**File:** `lib/db.ts` (line ~12)

**Description:**  
A module-load-time `throw` means the entire Next.js server fails to start if `DATABASE_URL` is absent — even in environments where the DB is not needed (e.g. local render testing). Since the database is only used for optional analytics (fire-and-forget), this is overly strict.

```ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
```

**Fix:**  
Lazy-initialize the pool on first use and emit a `console.warn` when the variable is absent, gracefully disabling analytics:

```ts
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL not set — analytics disabled");
    return null;
  }
  return globalThis.__pgPool ?? (globalThis.__pgPool = createPool());
}
```

---

### Issue 9 — `CHAR_WIDTH_RATIO` Inaccurate for Arabic Diacritics (Tashkeel)

**File:** `lib/layout.ts` (line ~36)

**Description:**  
The layout engine estimates text width as `text.length × fontSize × 0.55`. Arabic tashkeel characters (U+064B–U+065F) are combining marks with near-zero advance width but are counted as full characters by `.length`. This causes the engine to over-estimate width for voweled names, resulting in unnecessarily small font sizes.

**Recommendation:**  
Strip combining diacritics before measuring width, or use a separate (lower) width ratio for diacritics. Example:

```ts
const ARABIC_DIACRITIC_PATTERN = /[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC]/g;

export function estimateTextWidth(text: string, fontSize: number): number {
  const withoutDiacritics = text.replace(ARABIC_DIACRITIC_PATTERN, "");
  return withoutDiacritics.length * fontSize * CHAR_WIDTH_RATIO;
}
```

---

### Issue 10 — `split(" ")` Misses Non-Standard Space Variants

**File:** `lib/layout.ts` (line ~85)

**Description:**  
Line-break logic splits names on ASCII space (`U+0020`) only. Names containing non-breaking spaces (`U+00A0`), zero-width spaces (`U+200B`), or other Unicode space variants would not be split correctly. While the upstream Zod regex (`/^[\u0600-\u06FF\u0750-\u077F\s]+$/`) allows `\s` matches (which includes non-breaking space on some engines), the splitter does not handle them.

**Fix:**  
Use a Unicode-aware split:

```ts
const words = name.split(/\s+/);
```

This is consistent with how `normalizeName` already collapses whitespace.

---

### Issue 11 — Missing `aria-live` on Dynamic Error Messages

**File:** `components/CertificateShell.tsx` (lines ~132, ~148, ~155)

**Description:**  
Error messages for `nameError`, `emailError`, and `serverError` are injected into the DOM dynamically but carry no `aria-live` attribute. Screen readers will not announce these errors to visually-impaired users.

**Fix:**  
Add `aria-live="polite"` (or `assertive` for critical errors) to each error paragraph:

```tsx
{nameError && (
  <p className="text-[11px] text-red-300 drop-shadow font-arabic" aria-live="polite">
    {nameError}
  </p>
)}
```

---

### Issue 12 — No Test Coverage for `/api/track` and `/api/stats`

**File:** `scripts/`

**Description:**  
`scripts/test-edge-cases.ts` covers the image generation endpoint thoroughly, but there are no test scripts for:
- `/api/track` — missing/invalid event types, oversized bodies, missing session cookie
- `/api/stats` — wrong token, short token, absent `Authorization` header, correct token

The timing-safe comparison in `/api/stats` (Issue 6) is particularly important to test.

**Recommendation:**  
Add `scripts/test-track.ts` and `scripts/test-stats.ts` following the same pattern as `test-edge-cases.ts`.

---

## Positive Findings

The following aspects of the codebase are well-implemented and worth acknowledging:

- **Zod validation runs before any image work** — correct placement prevents wasted computation on invalid input.
- **Parameterized SQL everywhere** — no string interpolation in any DB query; SQL injection risk is zero.
- **No PII in logs or DB** — session IDs, event types, and timing data only; name/email never written.
- **Security headers are comprehensive** — CSP, HSTS, X-Frame-Options, Permissions-Policy all present in `next.config.ts`.
- **`timingSafeEqual` used for stats auth** — the intent is correct even if the implementation has a minor gap (Issue 6).
- **Fire-and-forget analytics** — DB failures never propagate to the user-facing response.
- **Font registered once per process** — avoids repeated disk I/O on the hot path.
- **`ssl: { rejectUnauthorized: true }` in production** — DB connections are verified against CA in prod.
